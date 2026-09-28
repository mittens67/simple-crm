import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import RefreshToken from '../../models/refresh-token';
import { env } from '../../config/env';
import {
  REFRESH_COOKIE,
  sign_access_token,
  verify_access_token,
  issue_refresh_token,
  revoke_all_for_user,
  rotate_refresh_token,
  revoke_refresh_token,
} from '../../auth/tokens';

/**
 * The most security-sensitive file in the repository, and until now it had no
 * coverage at all: refresh-token rotation, reuse detection, and the fact that
 * only an HMAC of the token is ever stored.
 */

/** Captures what the handler sets on the response. */
const mock_response = () => {
  const cookies: Record<string, { value: string; options: Record<string, unknown> }> = {};
  const cleared: string[] = [];

  const res = {
    cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
      cookies[name] = { value, options };
    }),
    clearCookie: vi.fn((name: string) => {
      cleared.push(name);
    }),
  } as unknown as Response;

  return { res, cookies, cleared };
};

const mock_request = (cookies: Record<string, string> = {}) =>
  ({ cookies }) as unknown as Request;

const expected_hash = (token: string) =>
  crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');

beforeEach(async () => {
  await RefreshToken.deleteMany({});
});

describe('access tokens', () => {
  it('round-trips the user id', () => {
    const user_id = new Types.ObjectId();
    const token = sign_access_token(user_id);

    expect(verify_access_token(token).sub).toBe(String(user_id));
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: 'attacker' }, 'not-the-real-secret');

    expect(() => verify_access_token(forged)).toThrow();
  });

  it('rejects a tampered payload', () => {
    const token = sign_access_token(new Types.ObjectId());
    const [header, , signature] = token.split('.');
    const forged_payload = Buffer.from(JSON.stringify({ sub: 'attacker' })).toString('base64url');

    expect(() => verify_access_token(`${header}.${forged_payload}.${signature}`)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ sub: 'someone' }, env.JWT_ACCESS_SECRET, { expiresIn: '-1s' });

    expect(() => verify_access_token(expired)).toThrow(jwt.TokenExpiredError);
  });

  it('carries no claim beyond the subject', () => {
    // Roles are deliberately not embedded: permissions are resolved per request
    // so a role change takes effect without waiting for the token to expire.
    const decoded = jwt.decode(sign_access_token(new Types.ObjectId())) as Record<string, unknown>;

    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'sub']);
  });
});

describe('issue_refresh_token', () => {
  it('stores only an HMAC, never the token itself', async () => {
    const user_id = new Types.ObjectId();
    const { res, cookies } = mock_response();

    await issue_refresh_token(user_id, res);

    const raw = cookies[REFRESH_COOKIE].value;
    const stored = await RefreshToken.findOne({ user_id });

    expect(stored).toBeTruthy();
    // A database leak must not hand out usable session tokens.
    expect(stored!.token_hash).not.toBe(raw);
    expect(stored!.token_hash).toBe(expected_hash(raw));
  });

  it('issues a high-entropy opaque token rather than a JWT', async () => {
    const { res, cookies } = mock_response();
    await issue_refresh_token(new Types.ObjectId(), res);

    const raw = cookies[REFRESH_COOKIE].value;
    // 48 random bytes in base64url.
    expect(raw.length).toBeGreaterThanOrEqual(60);
    expect(raw).not.toContain('.');
  });

  it('issues a different token every time', async () => {
    const user_id = new Types.ObjectId();
    const first = mock_response();
    const second = mock_response();

    await issue_refresh_token(user_id, first.res);
    await issue_refresh_token(user_id, second.res);

    expect(first.cookies[REFRESH_COOKIE].value).not.toBe(second.cookies[REFRESH_COOKIE].value);
  });

  it('sets the cookie httpOnly and scoped to the API path', async () => {
    const { res, cookies } = mock_response();
    await issue_refresh_token(new Types.ObjectId(), res);

    const { options } = cookies[REFRESH_COOKIE];
    // httpOnly is what keeps the refresh token out of reach of XSS.
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/graphql');
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it('sets an expiry matching the configured TTL', async () => {
    const user_id = new Types.ObjectId();
    const { res } = mock_response();

    await issue_refresh_token(user_id, res);

    const stored = await RefreshToken.findOne({ user_id });
    const days = (stored!.expires_at.getTime() - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(env.REFRESH_TOKEN_TTL_DAYS);
  });
});

describe('rotate_refresh_token', () => {
  /** Issues a token and returns its raw cookie value. */
  const issue_for = async (user_id: Types.ObjectId) => {
    const { res, cookies } = mock_response();
    await issue_refresh_token(user_id, res);
    return cookies[REFRESH_COOKIE].value;
  };

  it('returns the user and replaces the token', async () => {
    const user_id = new Types.ObjectId();
    const raw = await issue_for(user_id);
    const { res, cookies } = mock_response();

    const result = await rotate_refresh_token(mock_request({ [REFRESH_COOKIE]: raw }), res);

    expect(String(result)).toBe(String(user_id));
    // Rotation means the presented token is replaced, not reused.
    expect(cookies[REFRESH_COOKIE].value).not.toBe(raw);
  });

  it('revokes the presented token so it cannot be used twice', async () => {
    const user_id = new Types.ObjectId();
    const raw = await issue_for(user_id);

    await rotate_refresh_token(mock_request({ [REFRESH_COOKIE]: raw }), mock_response().res);

    const stored = await RefreshToken.findOne({ token_hash: expected_hash(raw) });
    expect(stored!.revoked_at).toBeTruthy();
  });

  it('returns null when no cookie is present', async () => {
    expect(await rotate_refresh_token(mock_request(), mock_response().res)).toBeNull();
  });

  it('returns null for a token that was never issued', async () => {
    const result = await rotate_refresh_token(
      mock_request({ [REFRESH_COOKIE]: 'fabricated-token' }),
      mock_response().res
    );
    expect(result).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const user_id = new Types.ObjectId();
    const raw = await issue_for(user_id);
    await RefreshToken.updateOne(
      { token_hash: expected_hash(raw) },
      { $set: { expires_at: new Date(Date.now() - 1000) } }
    );

    const result = await rotate_refresh_token(
      mock_request({ [REFRESH_COOKIE]: raw }),
      mock_response().res
    );
    expect(result).toBeNull();
  });

  it('does not issue a replacement when rotation fails', async () => {
    const { res, cookies } = mock_response();

    await rotate_refresh_token(mock_request({ [REFRESH_COOKIE]: 'fabricated' }), res);

    expect(cookies[REFRESH_COOKIE]).toBeUndefined();
  });

  /**
   * Reuse detection. Presenting an already-rotated token means either the user
   * replayed an old request or someone stole it — and the two are
   * indistinguishable, so every session for that user is killed.
   */
  it('treats reuse of a rotated token as theft and revokes every session', async () => {
    const user_id = new Types.ObjectId();
    const stolen = await issue_for(user_id);

    // Legitimate rotation.
    const first = mock_response();
    await rotate_refresh_token(mock_request({ [REFRESH_COOKIE]: stolen }), first.res);
    const fresh = first.cookies[REFRESH_COOKIE].value;

    // The attacker replays the token they captured.
    const replay = mock_response();
    const result = await rotate_refresh_token(
      mock_request({ [REFRESH_COOKIE]: stolen }),
      replay.res
    );

    expect(result).toBeNull();

    // And the token the legitimate user is now holding is dead too.
    const after = mock_response();
    expect(
      await rotate_refresh_token(mock_request({ [REFRESH_COOKIE]: fresh }), after.res)
    ).toBeNull();

    const live = await RefreshToken.countDocuments({
      user_id,
      revoked_at: { $exists: false },
    });
    expect(live).toBe(0);
  });

  it('a theft cascade affects only the compromised user', async () => {
    const victim = new Types.ObjectId();
    const bystander = new Types.ObjectId();

    const stolen = await issue_for(victim);
    const bystander_token = await issue_for(bystander);

    await rotate_refresh_token(mock_request({ [REFRESH_COOKIE]: stolen }), mock_response().res);
    // Replay triggers the cascade.
    await rotate_refresh_token(mock_request({ [REFRESH_COOKIE]: stolen }), mock_response().res);

    const still_valid = await rotate_refresh_token(
      mock_request({ [REFRESH_COOKIE]: bystander_token }),
      mock_response().res
    );
    expect(String(still_valid)).toBe(String(bystander));
  });

  it('supports a chain of rotations', async () => {
    const user_id = new Types.ObjectId();
    let current = await issue_for(user_id);

    for (let i = 0; i < 3; i += 1) {
      const step = mock_response();
      const result = await rotate_refresh_token(
        mock_request({ [REFRESH_COOKIE]: current }),
        step.res
      );
      expect(String(result)).toBe(String(user_id));
      current = step.cookies[REFRESH_COOKIE].value;
    }
  });
});

describe('revoke_all_for_user', () => {
  it('revokes every live session and leaves already-revoked ones alone', async () => {
    const user_id = new Types.ObjectId();
    const revoked_at = new Date('2026-01-01');

    await RefreshToken.create({
      user_id,
      token_hash: 'already-revoked',
      expires_at: new Date(Date.now() + 1000),
      revoked_at,
    });
    await RefreshToken.create({
      user_id,
      token_hash: 'live-one',
      expires_at: new Date(Date.now() + 1000),
    });

    await revoke_all_for_user(user_id);

    expect(await RefreshToken.countDocuments({ user_id, revoked_at: { $exists: false } })).toBe(0);
    // The original revocation timestamp is preserved.
    const untouched = await RefreshToken.findOne({ token_hash: 'already-revoked' });
    expect(untouched!.revoked_at!.getTime()).toBe(revoked_at.getTime());
  });
});

describe('revoke_refresh_token', () => {
  it('revokes the presented token and clears the cookie', async () => {
    const user_id = new Types.ObjectId();
    const { res: issue_res, cookies } = mock_response();
    await issue_refresh_token(user_id, issue_res);
    const raw = cookies[REFRESH_COOKIE].value;

    const { res, cleared } = mock_response();
    await revoke_refresh_token(mock_request({ [REFRESH_COOKIE]: raw }), res);

    expect(cleared).toContain(REFRESH_COOKIE);
    const stored = await RefreshToken.findOne({ token_hash: expected_hash(raw) });
    expect(stored!.revoked_at).toBeTruthy();
  });

  it('clears the cookie even with no token present', async () => {
    const { res, cleared } = mock_response();

    await revoke_refresh_token(mock_request(), res);

    expect(cleared).toContain(REFRESH_COOKIE);
  });

  it('leaves a revoked token unusable', async () => {
    const user_id = new Types.ObjectId();
    const { res: issue_res, cookies } = mock_response();
    await issue_refresh_token(user_id, issue_res);
    const raw = cookies[REFRESH_COOKIE].value;

    await revoke_refresh_token(mock_request({ [REFRESH_COOKIE]: raw }), mock_response().res);

    // Logging out then replaying the cookie must not restore the session.
    expect(
      await rotate_refresh_token(mock_request({ [REFRESH_COOKIE]: raw }), mock_response().res)
    ).toBeNull();
  });
});
