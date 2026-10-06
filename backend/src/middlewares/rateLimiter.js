const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for SMS invitation endpoint to prevent SMS spam and billing spikes
 */
const smsInviteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many SMS invites sent from this IP. Please wait a minute before sending more.'
  }
});

/**
 * Rate limiter for login endpoint to prevent brute-force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.'
  }
});

/**
 * Rate limiter for public chat endpoints (validating token, customer actions)
 */
const publicChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  smsInviteLimiter,
  authLimiter,
  publicChatLimiter
};
