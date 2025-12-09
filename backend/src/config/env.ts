// backend/src/config/env.ts
import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function getEnv(key: string, fallback?: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

export const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development')!,
  PORT: Number(getEnv('PORT', '4000')),

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Security / Auth
  JWT_SECRET: requireEnv('JWT_SECRET'),

  // Admin bootstrap (used only on first boot if no admin exists)
  ADMIN_DEFAULT_EMAIL: requireEnv('ADMIN_DEFAULT_EMAIL'),
  ADMIN_DEFAULT_PASSWORD: requireEnv('ADMIN_DEFAULT_PASSWORD'),

  // KillSwitch enforcement (optional for now, but we read it)
  KILLSWITCH_API_KEY: getEnv('KILLSWITCH_API_KEY', 'dev_killswitch_key_123'),

  // Stripe (future, optional)
  STRIPE_WEBHOOK_SECRET: getEnv('STRIPE_WEBHOOK_SECRET'),
  STRIPE_API_KEY: getEnv('STRIPE_API_KEY'),
};




