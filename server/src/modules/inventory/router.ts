import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as ctrl from './controller';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/', ctrl.list);
router.post('/',
  body('name').trim().notEmpty(),
  body('quantity').isInt({ min: 0 }),
  ctrl.create
);
router.patch('/:id',
  body('quantity').isInt({ min: 0 }),
  ctrl.update
);
router.delete('/:id', ctrl.remove);

export default router;
