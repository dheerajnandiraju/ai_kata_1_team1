import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as svc from './service';

export const submit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await svc.createRequest(req.user!.id, req.body.itemName, req.body.quantity, req.body.remarks);
    res.status(201).json({ request });
  } catch (err) { next(err); }
};

export const myRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status = '' } = req.query as Record<string, string>;
    res.json(await svc.getMyRequests(req.user!.id, +page, +limit, { status }));
  } catch (err) { next(err); }
};

export const allRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status = '' } = req.query as Record<string, string>;
    res.json(await svc.getAllRequests(+page, +limit, { status }));
  } catch (err) { next(err); }
};

export const pendingRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    res.json(await svc.getPendingRequests(+page, +limit));
  } catch (err) { next(err); }
};

export const approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await svc.approveRequest(req.params.id, req.user!.id);
    res.json({ request });
  } catch (err) { next(err); }
};

export const reject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await svc.rejectRequest(req.params.id, req.user!.id, req.body?.reason);
    res.json({ request });
  } catch (err) { next(err); }
};
