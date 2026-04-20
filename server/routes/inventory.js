const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

router.use(auth, roleCheck('admin'));

router.get('/', inventoryController.getAll);
router.post('/', inventoryController.create);
router.put('/:id', inventoryController.update);
router.delete('/:id', inventoryController.remove);

module.exports = router;
