import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as ctrl from './controller';

const router = Router();
router.use(authenticate);

router.post('/', requireRole('employee'), ctrl.submit);
router.get('/mine', requireRole('employee'), ctrl.myRequests);
router.get('/', requireRole('admin'), ctrl.allRequests);
router.get('/pending', requireRole('admin'), ctrl.pendingRequests);
router.patch('/:id/approve', requireRole('admin'), ctrl.approve);
router.patch('/:id/reject', requireRole('admin'), ctrl.reject);

export default router;
