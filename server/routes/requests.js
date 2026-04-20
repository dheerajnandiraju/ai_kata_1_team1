const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const requestController = require('../controllers/requestController');

const router = express.Router();

router.post('/', auth, roleCheck('employee'), requestController.create);
router.get('/', auth, requestController.getAll);
router.get('/:id', auth, requestController.getById);
router.patch('/:id/approve', auth, roleCheck('admin'), requestController.approve);
router.patch('/:id/reject', auth, roleCheck('admin'), requestController.reject);

module.exports = router;
