import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as svc from './service';

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search = '' } = req.query as Record<string, string>;
    res.json(await svc.getItems(+page, +limit, search));
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await svc.createItem(req.body.name, req.body.quantity);
    res.status(201).json({ item });
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await svc.updateItem(req.params.id, req.body.quantity);
    res.json({ item });
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await svc.deleteItem(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
};
