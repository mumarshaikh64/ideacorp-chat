const PresenceService = require('../services/presenceService');
const User = require('../models/User');

module.exports = function registerAgentHandlers(io, socket) {
  if (!socket.isStaff) return;

  const agentId = socket.user.id;

  // Join agent private notification room
  socket.join(`agent_${agentId}`);

  // If Admin or Supervisor, join admin feed
  if (['admin', 'supervisor'].includes(socket.user.role)) {
    socket.join('admin_feed');
  }

  // Register socket in presence map
  PresenceService.addAgentSocket(agentId, socket.id);

  /**
   * Real-time agent status toggle (Online / Busy / Offline)
   */
  socket.on('agent:status_toggle', async ({ status }, callback) => {
    try {
      if (!['online', 'busy', 'offline'].includes(status)) {
        if (callback) callback({ error: 'Invalid status' });
        return;
      }

      await User.updateStatus(agentId, status);
      await PresenceService.setAgentStatus(agentId, status, {
        name: socket.user.name,
        email: socket.user.email
      });

      // Broadcast to admin dashboard & all agents
      io.emit('agent:status_changed', {
        agentId,
        name: socket.user.name,
        status,
        timestamp: new Date().toISOString()
      });

      if (callback) callback({ success: true, status });
    } catch (err) {
      console.error('[Socket agent:status_toggle error]', err);
      if (callback) callback({ error: 'Failed to update agent status' });
    }
  });

  socket.on('disconnect', async () => {
    try {
      await PresenceService.removeAgentSocket(agentId, socket.id);
    } catch (err) {
      console.error('[Socket agent disconnect error]', err);
    }
  });
};
