import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as svc from './service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(String(req.query.page ?? '1'));
    const limit = parseInt(String(req.query.limit ?? '20'));
    const search = req.query.search as string | undefined;
    const result = await svc.listItems(page, limit, search);
    return res.json(result);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    const { name, quantity } = req.body;
    const item = await svc.createItem(name, quantity);
    return res.status(201).json({ item });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    const item = await svc.updateItem(String(req.params.id), req.body.quantity);
    return res.json({ item });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteItem(String(req.params.id));
    return res.status(204).send();
  } catch (err) { next(err); }
}
