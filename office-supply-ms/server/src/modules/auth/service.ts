import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../user/model';
import { RefreshToken } from './tokenModel';
import { AuthPayload } from '../../types/index';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const ACCESS_SECRET = () => {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error('JWT_ACCESS_SECRET not set');
  return s;
};
const REFRESH_SECRET = () => {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) throw new Error('JWT_REFRESH_SECRET not set');
  return s;
};
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

function refreshExpiryToMs(exp: string): number {
	const match = exp.trim().match(/^(\d+)([smhd])$/i);
	if (!match) return 7 * 24 * 60 * 60 * 1000;
	const value = parseInt(match[1], 10);
	const unit = match[2].toLowerCase();
	if (unit === 's') return value * 1000;
	if (unit === 'm') return value * 60 * 1000;
	if (unit === 'h') return value * 60 * 60 * 1000;
	return value * 24 * 60 * 60 * 1000;
}

export async function registerUser(name: string, email: string, password: string) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err: any = new Error('Email already in use');
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: 'employee' });
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const payload: AuthPayload = { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
  const accessToken = jwt.sign(payload, ACCESS_SECRET(), { expiresIn: ACCESS_EXPIRES } as any);
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
	const expiresAt = new Date(Date.now() + refreshExpiryToMs(REFRESH_EXPIRES));
  await RefreshToken.create({ userId: user._id, tokenHash, expiresAt });
  return { user, accessToken, refreshToken };
}

export async function refreshAccessToken(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
	const stored = await RefreshToken.findOneAndDelete({ tokenHash });
  if (!stored || stored.expiresAt < new Date()) {
    const err: any = new Error('Invalid or expired refresh token');
    err.status = 401;
    throw err;
  }
  const user = await User.findById(stored.userId);
  if (!user) {
    const err: any = new Error('User not found');
    err.status = 401;
    throw err;
  }
  const payload: AuthPayload = { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
  const accessToken = jwt.sign(payload, ACCESS_SECRET(), { expiresIn: ACCESS_EXPIRES } as any);
	const refreshToken = crypto.randomBytes(40).toString('hex');
	const newTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
	const expiresAt = new Date(Date.now() + refreshExpiryToMs(REFRESH_EXPIRES));
	await RefreshToken.create({ userId: user._id, tokenHash: newTokenHash, expiresAt });
	return { accessToken, refreshToken, user };
}

export async function logoutUser(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await RefreshToken.deleteOne({ tokenHash });
}
