const Conversation = require('../models/Conversation');
const { TransferLog } = require('../models/TransferLog');
const Message = require('../models/Message');
const User = require('../models/User');

module.exports = function registerTransferHandlers(io, socket) {
  /**
   * Handle real-time chat transfer between agents
   */
  socket.on('chat:transfer_request', async (data, callback) => {
    try {
      if (!socket.isStaff) {
        if (callback) callback({ error: 'Only authenticated agents or supervisors can transfer chats' });
        return;
      }

      const { conversationId, toAgentId, reason } = data || {};

      if (!conversationId || !toAgentId) {
        if (callback) callback({ error: 'conversationId and toAgentId are required' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (callback) callback({ error: 'Conversation not found' });
        return;
      }

      if (conversation.status === 'closed') {
        if (callback) callback({ error: 'Cannot transfer a closed conversation' });
        return;
      }

      // Check destination agent
      const toAgent = await User.findById(toAgentId);
      if (!toAgent) {
        if (callback) callback({ error: 'Target agent not found' });
        return;
      }

      const isSuperUser = ['admin', 'supervisor'].includes(socket.user.role);
      const isAssignedAgent = conversation.current_agent_id === socket.user.id;

      if (!isSuperUser && !isAssignedAgent) {
        if (callback) callback({
          error: 'Permission denied: Only Admin, Super Admin, Supervisor, or the assigned agent can transfer this conversation.'
        });
        return;
      }

      const fromAgentId = conversation.current_agent_id || socket.user.id;
      const fromAgentName = conversation.current_agent_name || 'Unassigned Pool';
      const toAgentName = toAgent.name;
      const transferredBy = socket.user.name;

      // 1. Update conversation in DB & set handlingMode to human
      await Conversation.updateAgent(conversationId, toAgentId);
      await Conversation.setHandlingMode(conversationId, 'human', { handoffRequested: false });

      // 2. Insert transfer audit log
      const log = await TransferLog.create({
        conversationId,
        fromAgentId,
        toAgentId,
        reason: reason ? `${reason} (Transferred by ${transferredBy})` : `Transferred by ${transferredBy}`
      });

      // 3. Insert system audit message in chat transcript
      const systemContent = socket.user.id === fromAgentId
        ? `Chat transferred from ${fromAgentName} to ${toAgentName}${reason ? `. Note: ${reason}` : ''}`
        : `Chat transferred from ${fromAgentName} to ${toAgentName} by ${transferredBy}${reason ? `. Note: ${reason}` : ''}`;

      const systemMsg = await Message.create({
        conversationId,
        senderType: 'system',
        content: systemContent
      });

      const room = `conversation_${conversationId}`;

      // 4. Notify Customer seamlessly (no interruption, banner notification)
      io.to(room).emit('chat:transferred', {
        conversationId,
        fromAgentName,
        toAgentName,
        toAgentId,
        reason,
        systemMessage: systemMsg,
        timestamp: new Date().toISOString()
      });

      // 5. Notify the new agent directly in their private room
      io.to(`agent_${toAgentId}`).emit('new_chat_assigned', {
        conversationId,
        customer: {
          id: conversation.customer_id,
          name: conversation.customer_name,
          phone: conversation.customer_phone
        },
        transferredFrom: fromAgentName,
        reason,
        timestamp: new Date().toISOString()
      });

      // 6. Notify the old agent
      io.to(`agent_${fromAgentId}`).emit('chat:transfer_completed', {
        conversationId,
        toAgentName
      });

      // 7. Notify admin/supervisor dashboard
      io.to('admin_feed').emit('admin:dashboard_update', {
        event: 'chat_transferred',
        conversationId,
        fromAgentName,
        toAgentName
      });

      if (callback) {
        callback({
          success: true,
          message: `Chat successfully transferred to ${toAgentName}`,
          transferLog: log
        });
      }
    } catch (err) {
      console.error('[Socket chat:transfer_request error]', err);
      if (callback) callback({ error: 'Failed to process chat transfer' });
    }
  });
};
