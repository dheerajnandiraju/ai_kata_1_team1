import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { dashboardHandler } from './controller';

const router = Router();

router.get('/', authenticate, dashboardHandler);

export default router;
