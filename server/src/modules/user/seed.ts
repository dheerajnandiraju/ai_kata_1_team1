import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './model';
import { env } from '../../config/env';

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (existing) {
    console.log('[Seed] Admin already exists, skipping.');
  } else {
    const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
    await User.create({ name: 'Admin', email: env.SEED_ADMIN_EMAIL, passwordHash, role: 'admin' });
    console.log('[Seed] Admin user created:', env.SEED_ADMIN_EMAIL);
  }
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
