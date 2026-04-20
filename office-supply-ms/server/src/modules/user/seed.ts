import bcrypt from 'bcryptjs';
import { User } from './model';

const SEED_USERS = [
  {
    email: 'admin@company.com',
    password: 'Admin@12345',
    name: 'Admin User',
    role: 'admin' as const,
  },
  {
    email: 'employee@company.com',
    password: 'Employee@12345',
    name: 'Demo Employee',
    role: 'employee' as const,
  },
];

export async function seedUsers(): Promise<void> {
  for (const userData of SEED_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (!existing) {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      await User.create({
        email: userData.email,
        passwordHash,
        name: userData.name,
        role: userData.role,
      });
      console.log(`Seeded user: ${userData.email}`);
    }
  }
}
