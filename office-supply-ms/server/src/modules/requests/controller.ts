import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import {
  createRequest, getMyRequests, getAllRequests, getPendingRequests, approveRequest, rejectRequest,
} from './service';

export const submitValidation = [
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('remarks').optional().isString(),
];

export async function submitRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    const { itemName, quantity, remarks } = req.body;
    const request = await createRequest(req.user!.id, itemName, quantity, remarks);
    res.status(201).json({ request });
  } catch (err) { next(err); }
}

export async function myRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const opts = { status: req.query.status, search: req.query.search, from: req.query.from, to: req.query.to };
    const result = await getMyRequests(req.user!.id, page, limit, opts);
    res.json(result);
  } catch (err) { next(err); }
}

export async function allRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const opts = { status: req.query.status, search: req.query.search, from: req.query.from, to: req.query.to };
    const result = await getAllRequests(page, limit, opts);
    res.json(result);
  } catch (err) { next(err); }
}

export async function pendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const result = await getPendingRequests(page, limit);
    res.json(result);
  } catch (err) { next(err); }
}

export async function approve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const request = await approveRequest(String(req.params.id), req.user!.id);
    res.json({ request });
  } catch (err) { next(err); }
}

export async function reject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reason } = req.body;
    const request = await rejectRequest(String(req.params.id), req.user!.id, reason);
    res.json({ request });
  } catch (err) { next(err); }
}
