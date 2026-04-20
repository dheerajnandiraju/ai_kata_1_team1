import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../../config/db';
import { env } from '../../config/env';
import User from './model';

async function seed() {
  await connectDB();

  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (existing) {
    console.log('[Seed] Admin already exists, skipping.');
    process.exit(0);
  }

  const admin = new User({
    name: 'Admin',
    email: env.SEED_ADMIN_EMAIL,
    passwordHash: env.SEED_ADMIN_PASSWORD,
    role: 'admin',
  });

  await admin.save();
  console.log(`[Seed] Admin created: ${env.SEED_ADMIN_EMAIL}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
