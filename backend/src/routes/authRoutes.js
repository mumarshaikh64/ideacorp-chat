const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateStaff } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/login', authLimiter, AuthController.login);
router.get('/me', authenticateStaff, AuthController.me);
router.post('/logout', authenticateStaff, AuthController.logout);

module.exports = router;
