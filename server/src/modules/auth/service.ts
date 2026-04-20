import bcrypt from 'bcryptjs';
import { User } from '../user/model';
import { RefreshToken } from './refreshToken.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from './token.util';
import { env } from '../../config/env';
import { UserDTO } from '../../types';

function toUserDTO(user: { _id: unknown; name: string; email: string; role: string }): UserDTO {
  return { _id: String(user._id), name: user.name, email: user.email, role: user.role as 'admin' | 'employee' };
}

export async function register(name: string, email: string, password: string) {
  const existing = await User.findOne({ email });
  if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 });
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role: 'employee' });
  const accessToken = signAccessToken({ id: String(user._id), name: user.name, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: String(user._id), name: user.name, email: user.email, role: user.role });
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return { user: toUserDTO(user), accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  const accessToken = signAccessToken({ id: String(user._id), name: user.name, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: String(user._id), name: user.name, email: user.email, role: user.role });
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return { user: toUserDTO(user), accessToken, refreshToken };
}

export async function refresh(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token), revoked: false });
  if (!stored || stored.expiresAt < new Date()) throw Object.assign(new Error('Refresh token expired or revoked'), { status: 401 });
  const user = await User.findById(payload.id);
  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });
  const accessToken = signAccessToken({ id: String(user._id), name: user.name, email: user.email, role: user.role });
  return { accessToken };
}

export async function logout(token: string) {
  await RefreshToken.updateOne({ tokenHash: hashToken(token) }, { revoked: true });
}
