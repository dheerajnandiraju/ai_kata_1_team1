import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as authService from './service';
import { env } from '../../config/env';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    const { name, email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.register(name, email, password);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    return res.status(201).json({ user, accessToken });
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    return res.status(200).json({ user, accessToken });
  } catch (err) { next(err); }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token: string | undefined = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const { accessToken } = await authService.refresh(token);
    return res.status(200).json({ accessToken });
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token: string | undefined = req.cookies?.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie('refreshToken');
    return res.status(204).send();
  } catch (err) { next(err); }
}
