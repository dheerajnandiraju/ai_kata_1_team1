import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as ctrl from './controller';

const router = Router();
router.use(authenticate);

// Employee
router.post('/',
  requireRole('employee'),
  body('itemName').trim().notEmpty(),
  body('quantity').isInt({ min: 1 }),
  body('remarks').optional().trim(),
  ctrl.submit
);
router.get('/mine', requireRole('employee'), ctrl.mine);

// Admin
router.get('/pending', requireRole('admin'), ctrl.pending);
router.get('/', requireRole('admin'), ctrl.all);
router.patch('/:id/approve', requireRole('admin'), ctrl.approve);
router.patch('/:id/reject', requireRole('admin'), ctrl.reject);

export default router;
