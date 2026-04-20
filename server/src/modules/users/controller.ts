import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as usersService from './service';
import { AuthRequest } from '../../middleware/authenticate';

export async function listHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page  = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) ?? undefined;
    const result = await usersService.listUsers(page, limit, search);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function changeRoleHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { id } = req.params;
    const { role } = req.body as { role: 'admin' | 'employee' };
    const user = await usersService.changeRole(id, req.user!.id, role);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deactivateHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.setActiveStatus(req.params.id, req.user!.id, false);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function reactivateHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.setActiveStatus(req.params.id, req.user!.id, true);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
