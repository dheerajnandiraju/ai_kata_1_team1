import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { getDashboard } from './service';

export async function dashboardHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id, role } = req.user!;
    const data = await getDashboard(role, id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
