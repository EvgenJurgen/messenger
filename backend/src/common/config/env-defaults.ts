/**
 * Default values when env vars are not set (dev convenience).
 * Production should set all values in .env.
 */
export const ENV_DEFAULTS = {
  PORT: 3000,
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_DATABASE: 'mock_db',
  JWT_SECRET: 'dev-secret-change-in-prod',
  /** JWT TTL in seconds (e.g. 3600 = 1 hour). */
  JWT_EXPIRES_IN: 3600,
  /** bcrypt salt rounds for password hashing. */
  BCRYPT_SALT_ROUNDS: 10,
} as const;
