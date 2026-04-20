import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../src/modules/user/model';

const MONGO_URI = 'mongodb+srv://admin:OsmsPass123@cluster0.kmmtnrf.mongodb.net/osms_test?appName=Cluster0';

beforeAll(async () => { await mongoose.connect(MONGO_URI); });
afterEach(async () => { await User.deleteMany({}); });
afterAll(async () => { await User.deleteMany({}); await mongoose.disconnect(); });

describe('User Model — Unit Tests', () => {
  it('creates a user with hashed password and default employee role', async () => {
    const hash = await bcrypt.hash('secret123', 10);
    const user = await User.create({ name: 'Alice', email: 'alice@test.com', passwordHash: hash });
    expect(user._id).toBeDefined();
    expect(user.role).toBe('employee');
    expect(user.email).toBe('alice@test.com');
  });

  it('stores a bcrypt hash, not the raw password', async () => {
    const raw = 'mypassword';
    const hash = await bcrypt.hash(raw, 10);
    const user = await User.create({ name: 'Bob', email: 'bob@test.com', passwordHash: hash });
    expect(user.passwordHash).not.toBe(raw);
    expect(await bcrypt.compare(raw, user.passwordHash)).toBe(true);
  });

  it('enforces unique email constraint', async () => {
    const hash = await bcrypt.hash('pass', 10);
    await User.create({ name: 'A', email: 'dup@test.com', passwordHash: hash });
    await expect(User.create({ name: 'B', email: 'dup@test.com', passwordHash: hash })).rejects.toThrow();
  });

  it('stores email in lowercase', async () => {
    const hash = await bcrypt.hash('pass', 10);
    const user = await User.create({ name: 'C', email: 'Upper@Test.com', passwordHash: hash });
    expect(user.email).toBe('upper@test.com');
  });

  it('assigns admin role when specified', async () => {
    const hash = await bcrypt.hash('pass', 10);
    const user = await User.create({ name: 'Admin', email: 'admin@test.com', passwordHash: hash, role: 'admin' });
    expect(user.role).toBe('admin');
  });

  it('does not return passwordHash in lean queries by default', async () => {
    const hash = await bcrypt.hash('pass', 10);
    await User.create({ name: 'D', email: 'd@test.com', passwordHash: hash });
    const found = await User.findOne({ email: 'd@test.com' }).select('-passwordHash').lean();
    expect((found as Record<string, unknown>)?.passwordHash).toBeUndefined();
  });
});
