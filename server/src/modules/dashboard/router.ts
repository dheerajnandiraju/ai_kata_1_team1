import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { dashboard } from './controller';

const router = Router();
router.get('/', authenticate, dashboard);

export default router;
