import { Request, Response, NextFunction } from 'express';
import * as authService from './service';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTS = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, maxAge: 7 * 24 * 60 * 60 * 1000 };

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.registerUser(name, email, password);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    res.status(201).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) { next(err); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) { res.status(401).json({ message: 'No refresh token' }); return; }
    const result = await authService.refreshAccessToken(token);
    res.json(result);
  } catch (err) { next(err); }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) await authService.logoutUser(token);
    res.clearCookie(REFRESH_COOKIE);
    res.status(204).send();
  } catch (err) { next(err); }
};
