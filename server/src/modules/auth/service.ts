import User from '../user/model';
import RefreshToken from './refreshToken.model';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from './token.util';
import { createError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { AuthPayload, UserDTO } from '../../types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ms = require('ms') as (value: string) => number;

function toUserDTO(user: { _id: unknown; name: string; email: string; role: 'admin' | 'employee' }): UserDTO {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function register(name: string, email: string, password: string) {
  const normalised = email.toLowerCase().trim();

  // Restrict registration to configured email domain (if set)
  if (env.ALLOWED_EMAIL_DOMAIN && !normalised.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`)) {
    throw createError('Registration is restricted to company email addresses', 403);
  }

  const existing = await User.findOne({ email: normalised });
  if (existing) throw createError('Email already registered', 409);

  const user = new User({ name, email: normalised, passwordHash: password, role: 'employee' });
  await user.save();

  console.info('[Auth] New user registered:', { userId: String(user._id), email: normalised });

  const payload: AuthPayload = { id: String(user._id), name: user.name, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshTokenRaw = signRefreshToken(payload);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshTokenRaw),
    expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES as string)),
    revoked: false,
  });

  return { user: toUserDTO(user), accessToken, refreshToken: refreshTokenRaw };
}

export async function login(email: string, password: string) {
  const normalised = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalised });

  if (!user) {
    console.warn('[Security] Failed login — unknown email:', normalised);
    throw createError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    console.warn('[Security] Failed login — deactivated account:', String(user._id));
    throw createError('Invalid credentials', 401);
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    console.warn('[Security] Failed login — wrong password for userId:', String(user._id));
    throw createError('Invalid credentials', 401);
  }

  console.info('[Auth] User logged in:', { userId: String(user._id), email: normalised, role: user.role });

  const payload: AuthPayload = { id: String(user._id), name: user.name, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshTokenRaw = signRefreshToken(payload);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshTokenRaw),
    expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES as string)),
    revoked: false,
  });

  return { user: toUserDTO(user), accessToken, refreshToken: refreshTokenRaw };
}

export async function refresh(rawToken: string) {
  let payload: AuthPayload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw createError('Invalid or expired refresh token', 401);
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(rawToken), revoked: false });
  if (!stored) throw createError('Refresh token revoked or not found', 401);

  const user = await User.findById(payload.id);
  if (!user) throw createError('User not found', 401);

  // Rotate refresh token — invalidate old, issue new (prevents token reuse after theft)
  stored.revoked = true;
  await stored.save();

  const newPayload: AuthPayload = { id: String(user._id), name: user.name, email: user.email, role: user.role };
  const accessToken = signAccessToken(newPayload);
  const newRefreshTokenRaw = signRefreshToken(newPayload);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(newRefreshTokenRaw),
    expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES as string)),
    revoked: false,
  });

  console.info('[Auth] Token refreshed for userId:', String(user._id));
  return { accessToken, refreshToken: newRefreshTokenRaw };
}

export async function logout(rawToken: string) {
  await RefreshToken.findOneAndUpdate(
    { tokenHash: hashToken(rawToken) },
    { revoked: true }
  );
}
