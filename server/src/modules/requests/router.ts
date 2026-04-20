import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import {
  createRequestHandler,
  myRequestsHandler,
  allRequestsHandler,
  pendingRequestsHandler,
  approveRequestHandler,
  rejectRequestHandler,
} from './controller';

const router = Router();

// Employee routes
router.post(
  '/',
  authenticate,
  requireRole('employee'),
  [
    body('itemName').trim().notEmpty().withMessage('Item name is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('remarks').optional().trim(),
  ],
  createRequestHandler
);

router.get('/mine', authenticate, requireRole('employee'), myRequestsHandler);

// Admin routes
router.get('/', authenticate, requireRole('admin'), allRequestsHandler);
router.get('/pending', authenticate, requireRole('admin'), pendingRequestsHandler);

router.patch('/:id/approve', authenticate, requireRole('admin'), approveRequestHandler);

router.patch(
  '/:id/reject',
  authenticate,
  requireRole('admin'),
  [body('reason').optional().trim()],
  rejectRequestHandler
);

export default router;
