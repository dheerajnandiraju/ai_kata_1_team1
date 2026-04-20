/**
 * Unit tests — User model (M-02)
 *
 * Covers:
 *  - Password is hashed on save (AC-10)
 *  - Plaintext password never stored
 *  - comparePassword returns true for correct candidate
 *  - comparePassword returns false for wrong candidate
 *  - passwordHash is stripped from toJSON output
 *  - Email is normalised to lowercase
 *  - Role defaults to 'employee'
 */

import mongoose from 'mongoose';
import User from '../src/modules/user/model';

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/osms_unit_user';

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('User model', () => {
  const plain = 'Password1';
  let userId: string;

  it('saves a user and hashes the password (plaintext never stored)', async () => {
    const user = new User({
      name: 'Unit Tester',
      email: 'unit@test.com',
      passwordHash: plain,
      role: 'employee',
    });
    await user.save();
    userId = String(user._id);

    expect(user.passwordHash).not.toBe(plain);
    expect(user.passwordHash).toMatch(/^\$2[ab]\$/); // bcrypt hash prefix
  });

  it('comparePassword returns true for the correct password', async () => {
    const user = await User.findById(userId);
    expect(user).not.toBeNull();
    const match = await user!.comparePassword(plain);
    expect(match).toBe(true);
  });

  it('comparePassword returns false for a wrong password', async () => {
    const user = await User.findById(userId);
    const match = await user!.comparePassword('WrongPass99');
    expect(match).toBe(false);
  });

  it('passwordHash is excluded from toJSON / API response', async () => {
    const user = await User.findById(userId);
    const json = user!.toJSON() as Record<string, unknown>;
    expect(json.passwordHash).toBeUndefined();
  });

  it('email is stored lowercase', async () => {
    const user = new User({
      name: 'Case Test',
      email: 'UPPER@TEST.COM',
      passwordHash: plain,
    });
    await user.save();
    expect(user.email).toBe('upper@test.com');
  });

  it('role defaults to employee when not specified', async () => {
    const user = new User({
      name: 'Default Role',
      email: 'default@test.com',
      passwordHash: plain,
    });
    await user.save();
    expect(user.role).toBe('employee');
  });

  it('rejects duplicate email with a MongoServerError', async () => {
    const dup = new User({
      name: 'Dup',
      email: 'unit@test.com',
      passwordHash: plain,
    });
    await expect(dup.save()).rejects.toThrow();
  });

  it('does not re-hash password if passwordHash field is not modified', async () => {
    const user = await User.findById(userId);
    const hashBefore = user!.passwordHash;
    user!.name = 'Updated Name';
    await user!.save();
    expect(user!.passwordHash).toBe(hashBefore);
  });
});
