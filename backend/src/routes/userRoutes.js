const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticateStaff, authorize } = require('../middlewares/auth');

router.use(authenticateStaff);

// Available agents for live transfer
router.get('/agents/available', authorize(['admin', 'agent', 'supervisor']), UserController.getAvailableAgents);

// General user list
router.get('/', authorize(['admin', 'supervisor']), UserController.list);
router.get('/:id', authorize(['admin', 'supervisor']), UserController.getById);

// Status toggle (agent or admin)
router.put('/:id/status', authorize(['admin', 'agent', 'supervisor']), UserController.updateStatus);

// Admin-only management
router.post('/', authorize(['admin']), UserController.create);
router.put('/:id', authorize(['admin']), UserController.update);
router.delete('/:id', authorize(['admin']), UserController.delete);

module.exports = router;
