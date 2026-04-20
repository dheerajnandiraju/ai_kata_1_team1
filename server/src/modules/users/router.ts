import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import {
  listHandler,
  changeRoleHandler,
  deactivateHandler,
  reactivateHandler,
} from './controller';

const router = Router();

// All users routes are admin-only
router.use(authenticate, requireRole('admin'));

/** GET /api/users?page=1&limit=20&search=alice */
router.get('/', listHandler);

/** PATCH /api/users/:id/role — change role */
router.patch(
  '/:id/role',
  [body('role').isIn(['admin', 'employee']).withMessage('Role must be admin or employee')],
  changeRoleHandler
);

/** PATCH /api/users/:id/deactivate — soft-disable login */
router.patch('/:id/deactivate', deactivateHandler);

/** PATCH /api/users/:id/reactivate — restore access */
router.patch('/:id/reactivate', reactivateHandler);

export default router;
