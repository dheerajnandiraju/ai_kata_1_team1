import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { getInventory, addItem, patchItem, removeItem, createValidation, updateValidation } from './controller';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', getInventory);
router.post('/', createValidation, addItem);
router.patch('/:id', updateValidation, patchItem);
router.delete('/:id', removeItem);

export default router;
