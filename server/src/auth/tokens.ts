import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import RefreshToken from '../models/refresh-token';
import { env } from '../config/env';

export const REFRESH_COOKIE = 'crm_refresh';

const is_prod = process.env.NODE_ENV === 'production';

export const sign_access_token = (user_id: string | Types.ObjectId): string =>
  jwt.sign({ sub: String(user_id) }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);

export const verify_access_token = (token: string): { sub: string } =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };

// Refresh tokens are opaque random strings; only an HMAC of them is stored.
const hash_token = (token: string): string =>
  crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');

const refresh_cookie_options = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: is_prod,
  path: '/graphql',
};

export const issue_refresh_token = async (
  user_id: Types.ObjectId,
  res: Response
): Promise<void> => {
  const token = crypto.randomBytes(48).toString('base64url');
  const expires_at = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await RefreshToken.create({
    user_id: user_id,
    token_hash: hash_token(token),
    expires_at: expires_at,
  });

  res.cookie(REFRESH_COOKIE, token, {
    ...refresh_cookie_options,
    maxAge: expires_at.getTime() - Date.now(),
  });
};

export const revoke_all_for_user = async (user_id: Types.ObjectId): Promise<void> => {
  await RefreshToken.updateMany(
    { user_id: user_id, revoked_at: { $exists: false } },
    { $set: { revoked_at: new Date() } }
  );
};

/**
 * Validates the refresh cookie and rotates it: the presented token is revoked
 * and a fresh one is set on the response. Returns the user id, or null if the
 * token is missing/invalid/expired. Reuse of an already-revoked token is
 * treated as theft and revokes every session for that user.
 */
export const rotate_refresh_token = async (
  req: Request,
  res: Response
): Promise<Types.ObjectId | null> => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return null;

  const stored = await RefreshToken.findOne({ token_hash: hash_token(token) });
  if (!stored) return null;

  if (stored.revoked_at) {
    await revoke_all_for_user(stored.user_id);
    return null;
  }
  if (stored.expires_at < new Date()) return null;

  stored.revoked_at = new Date();
  await stored.save();

  await issue_refresh_token(stored.user_id, res);
  return stored.user_id;
};

export const revoke_refresh_token = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await RefreshToken.updateOne(
      { token_hash: hash_token(token) },
      { $set: { revoked_at: new Date() } }
    );
  }
  res.clearCookie(REFRESH_COOKIE, refresh_cookie_options);
};
