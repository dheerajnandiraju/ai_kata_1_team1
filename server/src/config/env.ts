import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const env = {
  PORT: Number(process.env.PORT) || 3001,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/osms',
  JWT_SECRET: process.env.JWT_SECRET || 'changeme_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'changeme_refresh_secret',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  LOW_STOCK_THRESHOLD: Number(process.env.LOW_STOCK_THRESHOLD) || 5,
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS) || 12,
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@company.com',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_APP_PASSWORD: process.env.SMTP_APP_PASSWORD || '',
};
