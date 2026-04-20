import { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: string[]) {
  const allowedRoles = roles.map((role) => role.toLowerCase());
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!allowedRoles.includes(req.user.role.toLowerCase())) {
      res.status(403).json({ message: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
}
