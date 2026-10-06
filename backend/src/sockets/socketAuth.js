const { verifyStaffToken, verifyChatToken } = require('../services/tokenService');
const User = require('../models/User');

/**
 * Socket.IO authentication middleware
 * Validates either:
 * 1. Staff JWT (Admin / Agent / Supervisor / Viewer) via handshake.auth.token
 * 2. Customer signed chat token via handshake.auth.chatToken
 */
async function socketAuthMiddleware(socket, next) {
  try {
    const { token, chatToken } = socket.handshake.auth || {};

    // 1. Authenticate Staff User (JWT)
    if (token) {
      const { valid, user, error } = verifyStaffToken(token);
      if (!valid || !user) {
        return next(new Error(`Authentication failed: ${error || 'Invalid token'}`));
      }

      const dbUser = await User.findById(user.userId);
      if (!dbUser) {
        return next(new Error('User account does not exist'));
      }

      socket.isStaff = true;
      socket.user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        status: dbUser.status
      };
      return next();
    }

    // 2. Authenticate Customer (Signed Chat Token)
    if (chatToken) {
      const { valid, payload, error } = verifyChatToken(chatToken);
      if (!valid || !payload) {
        return next(new Error(`Customer token validation failed: ${error || 'Invalid or expired chat token'}`));
      }

      socket.isStaff = false;
      socket.customer = {
        inviteId: payload.inviteId,
        customerPhone: payload.customerPhone,
        customerId: payload.customerId,
        agentId: payload.agentId,
        conversationId: payload.conversationId || null
      };
      return next();
    }

    // Neither provided
    return next(new Error('Authentication credentials missing. Provide token or chatToken.'));
  } catch (err) {
    console.error('[Socket Auth Middleware Error]', err);
    return next(new Error('Internal server error during socket authentication'));
  }
}

module.exports = socketAuthMiddleware;
