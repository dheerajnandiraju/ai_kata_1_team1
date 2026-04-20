import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/token.util';
import { AuthPayload } from '../types';

declare module 'express-serve-static-core' {
  interface Request { user?: AuthPayload; }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
