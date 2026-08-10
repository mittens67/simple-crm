const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  PORT: process.env.PORT || '4000',
  MONGO_URI: required('MONGO_URI'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
};
