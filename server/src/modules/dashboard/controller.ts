import { Request, Response, NextFunction } from 'express';
import { getStats } from './service';
import { AuthPayload } from '../../types';

export async function dashboard(req: Request & { user?: AuthPayload }, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const stats = await getStats(user.role, user.id);
    return res.json(stats);
  } catch (err) { next(err); }
}
