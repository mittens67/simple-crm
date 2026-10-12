const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const number_from_env = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '4000',
  MONGO_URI: required('MONGO_URI'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
  // A GraphQL SPA issues many requests per screen — a dashboard alone fires
  // several. The old 100/15min ceiling throttled ordinary use.
  RATE_LIMIT_WINDOW_MS: number_from_env('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  RATE_LIMIT_MAX: number_from_env('RATE_LIMIT_MAX', 1000),
  AUTH_RATE_LIMIT_MAX: number_from_env('AUTH_RATE_LIMIT_MAX', 10),

  // --- AI ------------------------------------------------------------------
  // `mock` is the default on purpose: a fresh clone, the test suite and CI all
  // have to work with no API key and no network. Set AI_PROVIDER=gemini or
  // =mistral (plus the matching key) to use a real model.
  AI_PROVIDER: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
  MISTRAL_MODEL: process.env.MISTRAL_MODEL || 'mistral-small-latest',
  /** Hard ceiling on a single model call. Enforced with a real AbortController. */
  AI_TIMEOUT_MS: number_from_env('AI_TIMEOUT_MS', 15_000),
  /** Per-user calls per minute. Free tiers have low RPM ceilings. */
  AI_RATE_LIMIT_PER_MINUTE: number_from_env('AI_RATE_LIMIT_PER_MINUTE', 10),
  /** How long an identical prompt's answer is reused. */
  AI_CACHE_TTL_MS: number_from_env('AI_CACHE_TTL_MS', 15 * 60 * 1000),
  /** Lead scores older than this are considered stale. */
  AI_SCORE_TTL_MS: number_from_env('AI_SCORE_TTL_MS', 24 * 60 * 60 * 1000),
};

export const is_production = env.NODE_ENV === 'production';
