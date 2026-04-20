import { Router } from 'express';
import { register, login, refresh, logout, registerValidation, loginValidation } from './controller';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
