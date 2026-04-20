import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { listHandler, createHandler, updateHandler, deleteHandler } from './controller';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', listHandler);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Item name is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  ],
  createHandler
);

router.patch(
  '/:id',
  [body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')],
  updateHandler
);

router.delete('/:id', deleteHandler);

export default router;
