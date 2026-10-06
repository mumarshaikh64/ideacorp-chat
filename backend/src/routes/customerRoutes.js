const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const { authenticateStaff, authorize } = require('../middlewares/auth');

router.use(authenticateStaff);

router.get('/', authorize(['admin', 'agent', 'supervisor', 'viewer']), CustomerController.list);
router.get('/:id', authorize(['admin', 'agent', 'supervisor', 'viewer']), CustomerController.getById);
router.post('/', authorize(['admin', 'agent', 'supervisor']), CustomerController.create);
router.put('/:id', authorize(['admin', 'agent', 'supervisor']), CustomerController.update);

module.exports = router;
