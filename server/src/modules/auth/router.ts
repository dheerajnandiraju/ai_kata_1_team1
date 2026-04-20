import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from './controller';

const router = Router();

router.post('/register',
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  ctrl.register
);

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  ctrl.login
);

router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

export default router;
