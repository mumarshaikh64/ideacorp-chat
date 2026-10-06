const express = require('express');
const router = express.Router();
const InviteController = require('../controllers/inviteController');
const { authenticateStaff, authorize } = require('../middlewares/auth');
const { smsInviteLimiter, publicChatLimiter } = require('../middlewares/rateLimiter');

// Public route to validate token on customer landing page
router.get('/validate/:token', publicChatLimiter, InviteController.validateToken);

// Authenticated staff routes to send invites and list past invites
router.post(
  '/',
  authenticateStaff,
  authorize(['admin', 'agent', 'supervisor']),
  smsInviteLimiter,
  InviteController.createInvite
);

router.get(
  '/',
  authenticateStaff,
  authorize(['admin', 'agent', 'supervisor', 'viewer']),
  InviteController.listInvites
);

module.exports = router;
