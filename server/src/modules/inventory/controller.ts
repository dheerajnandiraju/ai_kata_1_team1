import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as inventoryService from './service';
import { AuthRequest } from '../../middleware/authenticate';

export async function listHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) ?? undefined;
    const result = await inventoryService.listItems(page, limit, search);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { name, quantity } = req.body as { name: string; quantity: number };
    const item = await inventoryService.createItem(name, quantity);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { id } = req.params;
    const { quantity } = req.body as { quantity: number };
    const item = await inventoryService.updateItem(id, quantity);
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await inventoryService.deleteItem(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
