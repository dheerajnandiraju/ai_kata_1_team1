import { Request, Response, NextFunction } from 'express';
import { getDashboardStats } from './service';

export async function dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getDashboardStats(req.user!.role);
    res.json(stats);
  } catch (err) { next(err); }
}
