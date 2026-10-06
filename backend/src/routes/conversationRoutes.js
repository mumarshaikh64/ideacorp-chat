const express = require('express');
const router = express.Router();
const ConversationController = require('../controllers/conversationController');
const { authenticateStaff, authorize } = require('../middlewares/auth');

router.use(authenticateStaff);

router.get('/kpi/summary', authorize(['admin', 'agent', 'supervisor', 'viewer']), ConversationController.getKPISummary);
router.get('/', authorize(['admin', 'agent', 'supervisor', 'viewer']), ConversationController.list);
router.get('/:id', authorize(['admin', 'agent', 'supervisor', 'viewer']), ConversationController.getById);
router.get('/:id/messages', authorize(['admin', 'agent', 'supervisor', 'viewer']), ConversationController.getMessages);
router.post('/:id/close', authorize(['admin', 'agent', 'supervisor']), ConversationController.close);

module.exports = router;
