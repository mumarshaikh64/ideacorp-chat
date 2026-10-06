const User = require('../models/User');
const PresenceService = require('../services/presenceService');

class UserController {
  static async list(req, res, next) {
    try {
      const { role, status, search, limit, offset } = req.query;
      const users = await User.list({
        role,
        status,
        search,
        limit: parseInt(limit || '50', 10),
        offset: parseInt(offset || '0', 10)
      });
      return res.json({ users });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }

      const user = await User.create({ name, email, password, role: role || 'agent' });
      return res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const { name, role, status, password } = req.body;
      const user = await User.update(req.params.id, { name, role, status, password });
      return res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const { status } = req.body; // 'online' | 'busy' | 'offline'
      const targetUserId = req.params.id;

      // Only allow updating own status unless admin
      if (req.user.role !== 'admin' && req.user.id !== targetUserId) {
        return res.status(403).json({ error: 'Unauthorized to change another agent status' });
      }

      if (!['online', 'busy', 'offline'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'online', 'busy', or 'offline'" });
      }

      const updated = await User.updateStatus(targetUserId, status);
      await PresenceService.setAgentStatus(targetUserId, status, {
        name: updated.name,
        email: updated.email
      });

      // Broadcast to socket clients
      const io = req.app.get('io');
      if (io) {
        io.emit('agent:status_changed', {
          agentId: targetUserId,
          status,
          name: updated.name,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({ user: updated });
    } catch (err) {
      next(err);
    }
  }

  static async getAvailableAgents(req, res, next) {
    try {
      // 1. Get from presence map
      const onlinePresences = await PresenceService.getAvailableAgents();

      // 2. Also query database for online agents
      const dbOnline = await User.list({ role: 'agent', status: 'online' });

      // Combine by ID
      const map = new Map();
      dbOnline.forEach(u => map.set(u.id, { id: u.id, name: u.name, email: u.email, status: u.status }));
      onlinePresences.forEach(p => {
        if (!map.has(p.agentId)) {
          map.set(p.agentId, { id: p.agentId, name: p.name, email: p.email, status: p.status });
        }
      });

      // Filter out caller if requested
      const excludeId = req.query.excludeId || req.user.id;
      const available = Array.from(map.values()).filter(a => a.id !== excludeId);

      return res.json({ agents: available });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const success = await User.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
