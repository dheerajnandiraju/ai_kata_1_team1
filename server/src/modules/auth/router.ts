import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from './controller';

const router = Router();

router.post('/register',
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  ctrl.register
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  ctrl.login
);

router.post('/refresh', ctrl.refreshToken);

router.post('/logout', ctrl.logout);

export default router;
