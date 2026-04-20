import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { listInventory, createItem, updateItem, deleteItem } from './service';

export const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
];

export const updateValidation = [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
];

export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search = (req.query.search as string) || undefined;
    const result = await listInventory(page, limit, search);
    res.json(result);
  } catch (err) { next(err); }
}

export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    const item = await createItem(req.body.name, req.body.quantity);
    res.status(201).json({ item });
  } catch (err) { next(err); }
}

export async function patchItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    const item = await updateItem(String(req.params.id), req.body.quantity);
    res.json({ item });
  } catch (err) { next(err); }
}

export async function removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteItem(String(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
}
