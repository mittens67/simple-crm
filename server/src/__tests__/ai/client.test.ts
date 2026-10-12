import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { extract_json, safe_json_parse, AiProvider, GenerateOptions } from '../../ai/provider';

/**
 * The cross-provider guarantees: structured output validation, one repair
 * retry, caching, per-user rate limiting and a real timeout. These hold for
 * every backend because they live in the client rather than in each provider.
 */

// The client reads env at module load, so it is imported fresh per test file
// with a controlled provider injected via the registry.
const load_client = async () => {
  vi.resetModules();
  return import('../../ai/client');
};

/** A provider whose responses the test controls exactly. */
class ScriptedProvider implements AiProvider {
  readonly name = 'mock';
  readonly is_configured = true;
  public calls: GenerateOptions[] = [];

  constructor(private responses: Array<string | Error>) {}

  async generate_text(options: GenerateOptions): Promise<string> {
    this.calls.push(options);
    const next = this.responses.shift();
    if (next === undefined) throw new Error('ScriptedProvider ran out of responses');
    if (next instanceof Error) throw next;
    return next;
  }
}

const install = async (provider: AiProvider) => {
  const client = await load_client();
  // Injected through the explicit seam: spying on the get_provider export
  // would not work, because calls inside the module resolve the local binding.
  client.set_provider(provider);
  return client;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('extract_json', () => {
  it('reads a bare JSON object', () => {
    expect(extract_json('{"a":1}')).toBe('{"a":1}');
  });

  it('unwraps a fenced code block', () => {
    expect(extract_json('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('pulls JSON out of surrounding prose', () => {
    // Models routinely add a sentence before the payload.
    expect(extract_json('Here you go: {"a":1} — hope that helps')).toBe('{"a":1}');
  });

  it('handles braces inside strings', () => {
    const input = '{"note":"a } brace","b":2}';
    expect(extract_json(input)).toBe(input);
  });

  it('handles escaped quotes inside strings', () => {
    const input = '{"note":"he said \\"hi\\" }","b":2}';
    expect(extract_json(input)).toBe(input);
  });

  it('reads an array payload', () => {
    expect(extract_json('prefix [1,2,3] suffix')).toBe('[1,2,3]');
  });
});

describe('safe_json_parse', () => {
  it('parses ordinary JSON unchanged', () => {
    expect(safe_json_parse('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips __proto__ rather than creating the key', () => {
    const result = safe_json_parse('{"a":1,"__proto__":{"bad":true}}') as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(['a']);
    expect(({} as Record<string, unknown>).bad).toBeUndefined();
  });

  it('strips constructor and prototype keys', () => {
    const result = safe_json_parse('{"constructor":1,"prototype":2,"ok":3}') as Record<
      string,
      unknown
    >;
    expect(Object.keys(result)).toEqual(['ok']);
  });
});

const schema = z.object({ value: z.number() });

describe('generate_json', () => {
  it('returns validated data', async () => {
    const provider = new ScriptedProvider(['{"value":42}']);
    const client = await install(provider);

    const result = await client.generate_json(schema, { actor_id: 'u1', prompt: 'p' });
    expect(result).toEqual({ value: 42 });
    expect(provider.calls).toHaveLength(1);
  });

  it('retries once with the validation error when output is malformed', async () => {
    const provider = new ScriptedProvider(['not json at all', '{"value":7}']);
    const client = await install(provider);

    const result = await client.generate_json(schema, { actor_id: 'u2', prompt: 'p' });

    expect(result).toEqual({ value: 7 });
    expect(provider.calls).toHaveLength(2);
    // The retry shows the model what was wrong with its own answer.
    expect(provider.calls[1].prompt).toContain('rejected');
  });

  it('retries when the JSON parses but fails the schema', async () => {
    const provider = new ScriptedProvider(['{"value":"not a number"}', '{"value":3}']);
    const client = await install(provider);

    expect(await client.generate_json(schema, { actor_id: 'u3', prompt: 'p' })).toEqual({
      value: 3,
    });
  });

  it('gives up after one retry rather than looping into the quota', async () => {
    const provider = new ScriptedProvider(['garbage', 'still garbage']);
    const client = await install(provider);

    await expect(
      client.generate_json(schema, { actor_id: 'u4', prompt: 'p' })
    ).rejects.toThrow(/unusable output/i);
    expect(provider.calls).toHaveLength(2);
  });
});

describe('caching', () => {
  it('serves an identical prompt from cache without calling the provider again', async () => {
    const provider = new ScriptedProvider(['first']);
    const client = await install(provider);

    const a = await client.generate_text({ actor_id: 'u5', prompt: 'same' });
    const b = await client.generate_text({ actor_id: 'u5', prompt: 'same' });

    expect(a).toBe('first');
    expect(b).toBe('first');
    // Free tiers have low ceilings; repeats must not cost a request.
    expect(provider.calls).toHaveLength(1);
  });

  it('treats a different prompt as a different entry', async () => {
    const provider = new ScriptedProvider(['one', 'two']);
    const client = await install(provider);

    await client.generate_text({ actor_id: 'u6', prompt: 'a' });
    await client.generate_text({ actor_id: 'u6', prompt: 'b' });

    expect(provider.calls).toHaveLength(2);
  });

  it('bypasses the cache when asked', async () => {
    const provider = new ScriptedProvider(['one', 'two']);
    const client = await install(provider);

    await client.generate_text({ actor_id: 'u7', prompt: 'same' });
    const second = await client.generate_text({
      actor_id: 'u7',
      prompt: 'same',
      bypass_cache: true,
    });

    expect(second).toBe('two');
    expect(provider.calls).toHaveLength(2);
  });
});

describe('rate limiting', () => {
  it('stops one user exhausting a shared third-party quota', async () => {
    // Distinct prompts, so the cache cannot mask the limiter.
    const provider = new ScriptedProvider(Array.from({ length: 40 }, (_, i) => `r${i}`));
    const client = await install(provider);

    let allowed = 0;
    let limited = false;
    for (let i = 0; i < 40; i += 1) {
      try {
        await client.generate_text({ actor_id: 'heavy', prompt: `prompt ${i}` });
        allowed += 1;
      } catch (error) {
        limited = error instanceof client.AiRateLimitError;
        break;
      }
    }

    expect(limited).toBe(true);
    expect(allowed).toBeGreaterThan(0);
    expect(allowed).toBeLessThan(40);
  });

  it('limits per user, not globally', async () => {
    const provider = new ScriptedProvider(Array.from({ length: 40 }, (_, i) => `r${i}`));
    const client = await install(provider);

    // Exhaust one user.
    for (let i = 0; i < 40; i += 1) {
      try {
        await client.generate_text({ actor_id: 'user-a', prompt: `a ${i}` });
      } catch {
        break;
      }
    }

    // A different user is unaffected.
    await expect(
      client.generate_text({ actor_id: 'user-b', prompt: 'b 1' })
    ).resolves.toBeTypeOf('string');
  });
});

describe('timeout', () => {
  it('aborts the request rather than racing a timer', async () => {
    /**
     * A Promise.race would resolve the timeout while leaving the HTTP request
     * in flight — still consuming quota and holding a socket. This asserts the
     * provider actually receives an aborted signal.
     */
    let received_signal: AbortSignal | undefined;

    const hanging: AiProvider = {
      name: 'mock',
      is_configured: true,
      generate_text: (options) =>
        new Promise((_resolve, reject) => {
          received_signal = options.signal;
          options.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    };

    const client = await install(hanging);

    await expect(
      client.generate_text({ actor_id: 'slow', prompt: 'hang' })
    ).rejects.toThrow(/timed out/i);

    expect(received_signal?.aborted).toBe(true);
  }, 30_000);
});
