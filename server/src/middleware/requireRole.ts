import { Request, Response, NextFunction } from 'express';
import { AuthPayload } from '../types';

export function requireRole(...roles: Array<'admin' | 'employee'>) {
  return (req: Request & { user?: AuthPayload }, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}
