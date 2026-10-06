const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');
const { authenticateStaff, authorize } = require('../middlewares/auth');

router.use(authenticateStaff);

router.get('/', authorize(['admin', 'supervisor', 'agent', 'viewer']), SettingsController.getSettings);
router.put('/', authorize(['admin']), SettingsController.updateSettings);

module.exports = router;
