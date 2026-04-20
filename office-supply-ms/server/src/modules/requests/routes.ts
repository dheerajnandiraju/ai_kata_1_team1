import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import {
  submitRequest, myRequests, allRequests, pendingRequests, approve, reject, submitValidation,
} from './controller';

const router = Router();
router.use(authenticate);

router.post('/', requireRole('employee'), submitValidation, submitRequest);
router.get('/mine', requireRole('employee'), myRequests);
router.get('/pending', requireRole('admin'), pendingRequests);
router.get('/', requireRole('admin'), allRequests);
router.patch('/:id/approve', requireRole('admin'), approve);
router.patch('/:id/reject', requireRole('admin'), reject);

export default router;
