import { createHash } from 'node:crypto';
import { ZodType } from 'zod';
import { env } from '../config/env';
import {
  AiProvider,
  AiProviderError,
  GenerateOptions,
  extract_json,
  safe_json_parse,
} from './provider';
import { MockProvider } from './mock';
import { GeminiProvider } from './gemini';
import { MistralProvider } from './mistral';

/**
 * Everything that is true regardless of which model is behind the interface:
 * provider selection, timeouts, per-user rate limiting, response caching,
 * structured-output validation and a single repair retry.
 *
 * Keeping these here is what makes adding a provider cheap, and it means the
 * safety properties cannot be accidentally skipped by one backend.
 */

const PROVIDERS: Record<string, () => AiProvider> = {
  mock: () => new MockProvider(),
  gemini: () => new GeminiProvider(),
  mistral: () => new MistralProvider(),
};

const build_provider = (): AiProvider => {
  const factory = PROVIDERS[env.AI_PROVIDER];
  if (!factory) {
    console.warn(
      `Unknown AI_PROVIDER "${env.AI_PROVIDER}"; falling back to the mock provider.`
    );
    return new MockProvider();
  }

  const provider = factory();
  if (!provider.is_configured) {
    // Degrading to the mock keeps the app usable rather than failing every
    // AI request at runtime because a key was forgotten.
    console.warn(
      `AI provider "${provider.name}" is missing its API key; falling back to the mock provider.`
    );
    return new MockProvider();
  }
  return provider;
};

let provider: AiProvider | null = null;

export const get_provider = (): AiProvider => {
  if (!provider) provider = build_provider();
  return provider;
};

/**
 * Explicit injection seam.
 *
 * Spying on the `get_provider` export would not work: calls inside this module
 * resolve the local binding, not the export, so the stub is never seen. An
 * explicit setter is both honest and the thing that makes the provider
 * abstraction genuinely substitutable.
 */
export const set_provider = (next: AiProvider | null) => {
  provider = next;
  cache.clear();
  call_log.clear();
};

/** Clears the active provider, cache and rate-limit state. */
export const reset_provider = () => set_provider(null);

// --- Caching ---------------------------------------------------------------

interface CacheEntry {
  value: string;
  expires_at: number;
}

const cache = new Map<string, CacheEntry>();

const cache_key = (options: GenerateOptions) =>
  createHash('sha256')
    .update(`${get_provider().name}\u0000${options.system ?? ''}\u0000${options.prompt}`)
    .digest('hex');

/**
 * Identical prompts are common here — scoring the same unchanged lead, or
 * two people asking the same question — and free tiers have low request
 * ceilings, so repeats are served from memory.
 *
 * Deliberately in-process: a shared cache would need Redis, which is more
 * infrastructure than this earns. The tradeoff is stated rather than hidden.
 */
const read_cache = (key: string): string | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires_at < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const write_cache = (key: string, value: string) => {
  cache.set(key, { value, expires_at: Date.now() + env.AI_CACHE_TTL_MS });
  // Crude bound so a long-running process cannot grow without limit.
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
};

// --- Rate limiting ---------------------------------------------------------

const call_log = new Map<string, number[]>();

export class AiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRateLimitError';
  }
}

/**
 * Per-user, per-minute ceiling. The HTTP rate limiter in index.ts protects the
 * server; this protects a metered third-party quota that one user could
 * otherwise exhaust for everyone.
 */
const enforce_rate_limit = (actor_id: string) => {
  const now = Date.now();
  const window_start = now - 60_000;
  const recent = (call_log.get(actor_id) ?? []).filter((at) => at > window_start);

  if (recent.length >= env.AI_RATE_LIMIT_PER_MINUTE) {
    throw new AiRateLimitError(
      `AI request limit reached (${env.AI_RATE_LIMIT_PER_MINUTE}/minute). Try again shortly.`
    );
  }

  recent.push(now);
  call_log.set(actor_id, recent);
};

// --- Generation ------------------------------------------------------------

export interface AiCallOptions extends Omit<GenerateOptions, 'signal'> {
  /** Rate limits are per user, so the caller must say who is asking. */
  actor_id: string;
  /** Skips the cache when a fresh answer is explicitly wanted. */
  bypass_cache?: boolean;
}

/**
 * A real AbortController, not Promise.race.
 *
 * Racing a timer leaves the HTTP request in flight: it still finishes, still
 * costs quota, and still holds a socket. Aborting actually cancels it.
 */
const with_timeout = async <T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);
  try {
    return await work(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AiProviderError(
        `AI request timed out after ${env.AI_TIMEOUT_MS}ms`,
        get_provider().name
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const generate_text = async (options: AiCallOptions): Promise<string> => {
  const key = cache_key(options);

  if (!options.bypass_cache) {
    const hit = read_cache(key);
    if (hit !== null) return hit;
  }

  enforce_rate_limit(options.actor_id);

  const text = await with_timeout((signal) =>
    get_provider().generate_text({
      system: options.system,
      prompt: options.prompt,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      signal,
    })
  );

  write_cache(key, text);
  return text;
};

export class AiOutputError extends Error {
  constructor(
    message: string,
    public readonly raw: string
  ) {
    super(message);
    this.name = 'AiOutputError';
  }
}

/**
 * Asks for JSON and validates it against a zod schema before anything else
 * touches it.
 *
 * Model output is untrusted input. Nothing downstream sees an unvalidated
 * object, which is what keeps the natural-language search from becoming a
 * query-injection hole (see ai/search-schema.ts for the allowlist).
 *
 * One repair retry: a single malformed response is common and cheap to fix by
 * showing the model its own error. A second failure is a real problem and is
 * surfaced rather than retried into a quota hole.
 */
export const generate_json = async <T>(
  schema: ZodType<T>,
  options: AiCallOptions
): Promise<T> => {
  const attempt = async (extra_instruction?: string): Promise<T> => {
    const raw = await generate_text({
      ...options,
      prompt: extra_instruction ? `${options.prompt}\n\n${extra_instruction}` : options.prompt,
      // A retry must not be served the cached bad answer.
      bypass_cache: options.bypass_cache || Boolean(extra_instruction),
    });

    // safe_json_parse, not JSON.parse: it strips __proto__ and friends,
    // which zod's .strict() does not reject on its own.
    const parsed = schema.safeParse(safe_json_parse(extract_json(raw)));
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ');
      throw new AiOutputError(issues, raw);
    }
    return parsed.data;
  };

  try {
    return await attempt();
  } catch (first_error) {
    if (first_error instanceof AiRateLimitError) throw first_error;

    const detail =
      first_error instanceof AiOutputError
        ? first_error.message
        : 'the previous response was not valid JSON';

    try {
      return await attempt(
        `Your previous answer was rejected (${detail}). ` +
          'Reply with the corrected JSON object only — no prose, no code fence.'
      );
    } catch (second_error) {
      throw new AiOutputError(
        `AI returned unusable output after a retry: ${
          second_error instanceof Error ? second_error.message : String(second_error)
        }`,
        second_error instanceof AiOutputError ? second_error.raw : ''
      );
    }
  }
};

export interface AiStatus {
  provider: string;
  /** True when a real model is answering rather than the deterministic mock. */
  is_live: boolean;
  model: string | null;
}

export const ai_status = (): AiStatus => {
  const active = get_provider();
  const model =
    active.name === 'gemini'
      ? env.GEMINI_MODEL
      : active.name === 'mistral'
        ? env.MISTRAL_MODEL
        : null;
  return { provider: active.name, is_live: active.name !== 'mock', model };
};
