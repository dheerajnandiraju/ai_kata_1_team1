import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as requestsService from './service';
import { AuthRequest } from '../../middleware/authenticate';

export async function createRequestHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { itemName, quantity, remarks } = req.body as { itemName: string; quantity: number; remarks?: string };
    const request = await requestsService.createRequest(req.user!.id, itemName, quantity, remarks);
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}

export async function myRequestsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await requestsService.listRequests({
      page,
      limit,
      userId: req.user!.id,
      status: req.query.status as string,
      search: req.query.search as string,
      from: req.query.from as string,
      to: req.query.to as string,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function allRequestsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await requestsService.listRequests({
      page,
      limit,
      status: req.query.status as string,
      search: req.query.search as string,
      from: req.query.from as string,
      to: req.query.to as string,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function pendingRequestsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await requestsService.listRequests({ page, limit, status: 'pending' });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function approveRequestHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const request = await requestsService.approveRequest(req.params.id, req.user!.id);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

export async function rejectRequestHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: string };
    const request = await requestsService.rejectRequest(req.params.id, req.user!.id, reason);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}
