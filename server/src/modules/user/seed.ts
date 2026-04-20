import 'dotenv/config';
import { connectDB } from '../../config/db';
import { User } from './model';
import { env } from '../../config/env';

const seed = async () => {
  await connectDB();
  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (existing) {
    console.log('Admin already exists.');
    process.exit(0);
  }
  const admin = new User({
    name: 'Admin',
    email: env.SEED_ADMIN_EMAIL,
    passwordHash: env.SEED_ADMIN_PASSWORD,
    role: 'admin',
  });
  await admin.save();
  console.log(`Admin seeded: ${env.SEED_ADMIN_EMAIL}`);
  process.exit(0);
};

seed();
