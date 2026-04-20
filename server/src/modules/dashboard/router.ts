import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { dashboard } from './controller';

const router = Router();
router.use(authenticate);
router.get('/', dashboard);

export default router;
