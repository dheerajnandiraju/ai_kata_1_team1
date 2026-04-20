import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (one level above server/) when running locally
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Also try local server/.env as fallback (Docker / CI use-case)
dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

/** Requires the variable AND enforces a minimum entropy length. */
function strongSecret(name: string, minLength = 32): string {
  const val = required(name);
  if (val.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`);
  }
  return val;
}

export const env = {
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/osms',
  JWT_SECRET: strongSecret('JWT_SECRET'),
  JWT_REFRESH_SECRET: strongSecret('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  LOW_STOCK_THRESHOLD: parseInt(process.env.LOW_STOCK_THRESHOLD ?? '5', 10),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? 'admin@company.com',
  // No fallback — must be explicitly set to prevent well-known default passwords
  SEED_ADMIN_PASSWORD: required('SEED_ADMIN_PASSWORD'),
  ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN ?? '',
};
