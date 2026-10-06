const User = require('../models/User');
const { generateStaffToken } = require('../services/tokenService');
const PresenceService = require('../services/presenceService');

class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Automatically set agent to 'online' upon login
      const updatedUser = await User.updateStatus(user.id, 'online');
      await PresenceService.setAgentStatus(user.id, 'online', {
        name: updatedUser.name,
        email: updatedUser.email
      });

      const token = generateStaffToken(updatedUser);

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      if (req.user) {
        await User.updateStatus(req.user.id, 'offline');
        await PresenceService.setAgentStatus(req.user.id, 'offline');
      }
      return res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
