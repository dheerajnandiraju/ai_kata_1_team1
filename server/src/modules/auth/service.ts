import { User } from '../user/model';
import { RefreshToken, signAccessToken, signRefreshToken, hashToken } from './token.util';
import { env } from '../../config/env';

export const registerUser = async (name: string, email: string, password: string) => {
  const existing = await User.findOne({ email });
  if (existing) throw Object.assign(new Error('Email already in use'), { status: 409 });
  const user = new User({ name, email, passwordHash: password, role: 'employee' });
  await user.save();
  const payload = { id: String(user._id), name: user.name, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const rawRefresh = signRefreshToken();
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(rawRefresh),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return { user: payload, accessToken, refreshToken: rawRefresh };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
  const payload = { id: String(user._id), name: user.name, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const rawRefresh = signRefreshToken();
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(rawRefresh),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return { user: payload, accessToken, refreshToken: rawRefresh };
};

export const refreshAccessToken = async (rawToken: string) => {
  const hashed = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash: hashed, revoked: false });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }
  const user = await User.findById(stored.userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });
  const payload = { id: String(user._id), name: user.name, email: user.email, role: user.role };
  return { accessToken: signAccessToken(payload) };
};

export const logoutUser = async (rawToken: string) => {
  const hashed = hashToken(rawToken);
  await RefreshToken.updateOne({ tokenHash: hashed }, { revoked: true });
};
