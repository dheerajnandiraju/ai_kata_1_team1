import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as authService from './service';
import { env } from '../../config/env';
import { AuthRequest } from '../../middleware/authenticate';

const REFRESH_COOKIE = 'refreshToken';
const cookieOptions = {
  httpOnly: true,
  // Always secure except during automated tests — prevents cookie over plain HTTP
  secure: process.env.NODE_ENV !== 'test',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { name, email, password } = req.body as { name: string; email: string; password: string };
    const { user, accessToken, refreshToken } = await authService.register(name, email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { email, password } = req.body as { email: string; password: string };
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!rawToken) {
      res.status(401).json({ message: 'No refresh token provided' });
      return;
    }
    const { accessToken, refreshToken } = await authService.refresh(rawToken);
    // Rotate cookie — replace old token with newly issued one
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (rawToken) {
      await authService.logout(rawToken);
    }
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
