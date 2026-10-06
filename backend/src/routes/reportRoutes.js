const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { authenticateStaff, authorize } = require('../middlewares/auth');

router.use(authenticateStaff);

router.get('/analytics', authorize(['admin', 'supervisor', 'viewer']), ReportController.getAnalytics);
router.get('/export', authorize(['admin', 'supervisor', 'viewer']), ReportController.exportConversationsCSV);

module.exports = router;
