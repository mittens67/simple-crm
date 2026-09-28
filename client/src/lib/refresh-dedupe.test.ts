import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Refresh tokens rotate, and the server treats a replayed token as theft by
 * revoking every session for that user. Two concurrent refreshes would
 * therefore log the user out entirely — the first rotates the cookie and the
 * second looks like a replay.
 *
 * Several queries can fail with UNAUTHENTICATED in the same tick, so this is
 * reachable in normal use rather than a theoretical race.
 */
describe('refresh_session de-duplication', () => {
  let fetch_calls = 0;

  beforeEach(() => {
    vi.resetModules();
    fetch_calls = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stub_fetch = (delay_ms = 20) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetch_calls += 1;
        await new Promise((resolve) => setTimeout(resolve, delay_ms));
        return {
          json: async () => ({
            data: {
              refreshToken: {
                accessToken: `token-${fetch_calls}`,
                user: { id: 'u1', name: 'Rep', email: 'rep@example.com', roles: [] },
              },
            },
          }),
        };
      })
    );
  };

  it('issues one request for concurrent callers', async () => {
    stub_fetch();
    const { refresh_session } = await import('./auth');

    const results = await Promise.all([
      refresh_session(),
      refresh_session(),
      refresh_session(),
    ]);

    // One rotation, so the cookie is never replayed.
    expect(fetch_calls).toBe(1);
    // And every caller gets the same answer.
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });

  it('allows a fresh request once the previous one settles', async () => {
    stub_fetch(0);
    const { refresh_session } = await import('./auth');

    await refresh_session();
    await refresh_session();

    // Sequential calls are genuinely separate refreshes.
    expect(fetch_calls).toBe(2);
  });

  it('clears the in-flight request when the refresh fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetch_calls += 1;
        throw new Error('network down');
      })
    );
    const { refresh_session } = await import('./auth');

    expect(await refresh_session()).toBeNull();
    // A failure must not leave a poisoned promise that every later caller
    // receives forever.
    expect(await refresh_session()).toBeNull();
    expect(fetch_calls).toBe(2);
  });
});
