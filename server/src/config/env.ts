import dotenv from 'dotenv';
dotenv.config();

export const env = {
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/osms',
  JWT_SECRET: process.env.JWT_SECRET ?? 'changeme_access_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'changeme_refresh_secret',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  LOW_STOCK_THRESHOLD: parseInt(process.env.LOW_STOCK_THRESHOLD ?? '5', 10),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? 'admin@company.com',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
};
