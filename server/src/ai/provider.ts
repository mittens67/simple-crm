/**
 * The contract every model backend implements.
 *
 * Deliberately one method. Structured output, validation, retries, caching,
 * rate limiting and timeouts are all provider-independent concerns, so they
 * live once in ai/client.ts rather than being reimplemented per vendor. A new
 * provider is therefore ~40 lines: build a request, return the text.
 */
export interface GenerateOptions {
  /** Instructions about behaviour and output shape. */
  system?: string;
  prompt: string;
  max_tokens?: number;
  /** 0 for extraction and classification, higher for drafting prose. */
  temperature?: number;
  /** Cancels the in-flight HTTP request. Not a Promise.race — see client.ts. */
  signal?: AbortSignal;
}

export interface AiProvider {
  /** Identifies the backend in logs and in the GraphQL aiStatus query. */
  readonly name: string;
  /** False when the provider is configured but missing its credentials. */
  readonly is_configured: boolean;
  generate_text(options: GenerateOptions): Promise<string>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

/**
 * Parses model output with prototype-polluting keys stripped.
 *
 * `JSON.parse('{"__proto__": {...}}')` creates a real own property named
 * `__proto__`, and zod's `.strict()` does NOT flag it as an unknown key — so
 * the allowlist alone does not catch it. Anything that later spreads or
 * deep-merges that object could walk it onto Object.prototype.
 *
 * The reviver drops the dangerous keys before any of that can happen, so the
 * guarantee the search allowlist advertises actually holds.
 */
const POLLUTING_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const safe_json_parse = (text: string): unknown =>
  JSON.parse(text, function reviver(key, value) {
    if (POLLUTING_KEYS.has(key)) return undefined;
    return value;
  });

/**
 * Models are asked for JSON but routinely wrap it in prose or a ```json fence.
 * Rather than failing the call, pull the first balanced JSON value out of the
 * response; the zod schema then decides whether it is actually usable.
 */
export const extract_json = (text: string): string => {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  const start = candidate.search(/[[{]/);
  if (start === -1) return candidate;

  const opener = candidate[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let in_string = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i += 1) {
    const char = candidate[i];

    if (in_string) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') in_string = false;
      continue;
    }

    if (char === '"') in_string = true;
    else if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }

  return candidate.slice(start);
};
