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
};

export const is_production = env.NODE_ENV === 'production';
