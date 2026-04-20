import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { requestAssist, requestAssistValidation } from './controller';

const router = Router();

router.use(authenticate);
router.post('/request-assist', requireRole('employee', 'admin'), requestAssistValidation, requestAssist);

export default router;
