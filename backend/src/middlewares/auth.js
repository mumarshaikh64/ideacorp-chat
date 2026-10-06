const { verifyStaffToken } = require('../services/tokenService');
const db = require('../config/db');

/**
 * Middleware to authenticate staff JWT tokens (Admin, Agent, Supervisor, Viewer)
 */
async function authenticateStaff(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token missing or invalid format' });
    }

    const token = authHeader.split(' ')[1];
    const { valid, user, error } = verifyStaffToken(token);

    if (!valid || !user) {
      return res.status(401).json({ error: error || 'Invalid or expired token' });
    }

    // Verify user still exists and is active in database
    const userRes = await db.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [user.userId]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User account not found' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

/**
 * RBAC Middleware to restrict routes to specified roles
 * @param {string[]} allowedRoles - e.g. ['admin'], ['admin', 'supervisor'], ['admin', 'agent']
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized for this resource.`
      });
    }

    next();
  };
}

module.exports = {
  authenticateStaff,
  authorize
};
