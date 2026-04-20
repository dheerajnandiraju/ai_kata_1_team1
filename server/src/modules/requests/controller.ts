import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as svc from './service';
import { AuthPayload } from '../../types';

declare module 'express-serve-static-core' {
  interface Request { user?: AuthPayload; }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    const { itemName, quantity, remarks } = req.body;
    const request = await svc.createRequest(req.user!.id, itemName, quantity, remarks);
    return res.status(201).json({ request });
  } catch (err) { next(err); }
}

export async function mine(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listMine(req.user!.id, req.query as Record<string, unknown>);
    return res.json(result);
  } catch (err) { next(err); }
}

export async function all(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listAll(req.query as Record<string, unknown>);
    return res.json(result);
  } catch (err) { next(err); }
}

export async function pending(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(String(req.query.page ?? '1'));
    const limit = parseInt(String(req.query.limit ?? '20'));
    const result = await svc.listPending(page, limit);
    return res.json(result);
  } catch (err) { next(err); }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await svc.approveRequest(String(req.params.id), req.user!.id);
    return res.json({ request });
  } catch (err) { next(err); }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await svc.rejectRequest(String(req.params.id), req.user!.id, req.body?.reason);
    return res.json({ request });
  } catch (err) { next(err); }
}
