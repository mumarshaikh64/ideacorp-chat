const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Service for generating and verifying cryptographically signed tokens
 */

/**
 * Generate a secure, signed, time-limited token for customer chat links
 */
function generateChatToken({ inviteId, customerPhone, customerId, agentId, conversationId = null, expiresInMinutes = null }) {
  const expiry = (expiresInMinutes || env.CHAT_TOKEN_EXPIRY_MINUTES) * 60; // in seconds
  
  const payload = {
    type: 'customer_chat',
    inviteId,
    customerPhone,
    customerId,
    agentId,
    conversationId,
    nonce: crypto.randomBytes(8).toString('hex')
  };

  return jwt.sign(payload, env.CHAT_TOKEN_SECRET, {
    expiresIn: expiry,
    algorithm: 'HS256'
  });
}

/**
 * Verify a customer chat token
 */
function verifyChatToken(token) {
  try {
    const decoded = jwt.verify(token, env.CHAT_TOKEN_SECRET, { algorithms: ['HS256'] });
    if (decoded.type !== 'customer_chat') {
      return { valid: false, error: 'Invalid token type' };
    }
    return { valid: true, payload: decoded };
  } catch (err) {
    return { valid: false, error: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token signature' };
  }
}

/**
 * Generate a JWT for staff (Admin, Sales Agent, Supervisor, Viewer)
 */
function generateStaffToken(user) {
  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256'
  });
}

/**
 * Verify a staff JWT
 */
function verifyStaffToken(token) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return { valid: true, user: decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = {
  generateChatToken,
  verifyChatToken,
  generateStaffToken,
  verifyStaffToken
};
