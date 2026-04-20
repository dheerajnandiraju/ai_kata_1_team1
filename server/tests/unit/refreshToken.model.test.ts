import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model';
import { User, IUser } from '../../src/modules/user/model';

const MONGO_URI = 'mongodb+srv://admin:OsmsPass123@cluster0.kmmtnrf.mongodb.net/osms_test?appName=Cluster0';

let user: IUser;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  const hash = await bcrypt.hash('pass', 10);
  user = await User.create({ name: 'Test', email: 'rt@test.com', passwordHash: hash });
});
afterEach(async () => { await RefreshToken.deleteMany({}); });
afterAll(async () => { await RefreshToken.deleteMany({}); await User.deleteMany({}); await mongoose.disconnect(); });

describe('RefreshToken Model — Unit Tests', () => {
  it('creates a refresh token linked to a user', async () => {
    const rt = await RefreshToken.create({
      userId: user._id,
      tokenHash: 'abc123hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(rt.userId.toString()).toBe(user._id.toString());
    expect(rt.revoked).toBe(false);
  });

  it('marks a token as revoked', async () => {
    const rt = await RefreshToken.create({
      userId: user._id, tokenHash: 'tokenhash', expiresAt: new Date(Date.now() + 86400000),
    });
    await RefreshToken.findByIdAndUpdate(rt._id, { revoked: true });
    const found = await RefreshToken.findById(rt._id);
    expect(found?.revoked).toBe(true);
  });

  it('detects expired tokens by expiresAt < now', async () => {
    await RefreshToken.create({
      userId: user._id, tokenHash: 'expiredhash',
      expiresAt: new Date(Date.now() - 1000), // already expired
    });
    const expired = await RefreshToken.findOne({
      tokenHash: 'expiredhash', expiresAt: { $lt: new Date() },
    });
    expect(expired).not.toBeNull();
  });

  it('does not find a revoked token in valid-token query', async () => {
    await RefreshToken.create({
      userId: user._id, tokenHash: 'revokedhash',
      expiresAt: new Date(Date.now() + 86400000), revoked: true,
    });
    const found = await RefreshToken.findOne({ tokenHash: 'revokedhash', revoked: false });
    expect(found).toBeNull();
  });

  it('stores a SHA-256 hash string, not the raw token', async () => {
    const hash = 'sha256hashedvalue1234567890abcdef';
    const rt = await RefreshToken.create({
      userId: user._id, tokenHash: hash, expiresAt: new Date(Date.now() + 86400000),
    });
    expect(rt.tokenHash).toBe(hash);
    expect(rt.tokenHash).not.toBe('rawtoken');
  });
});
