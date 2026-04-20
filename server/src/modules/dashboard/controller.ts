import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as svc from './service';

export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await svc.getDashboard(req.user!.role));
  } catch (err) { next(err); }
};
