const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { TransferLog } = require('../models/TransferLog');
const PresenceService = require('../services/presenceService');

class ConversationController {
  /**
   * List conversations with role-based scoping and filters
   */
  static async list(req, res, next) {
    try {
      const { status, agentId, search, limit, offset } = req.query;

      // Role check: Agents can only view their own conversations unless they are supervisor or admin
      let targetAgentId = agentId;
      if (req.user.role === 'agent') {
        targetAgentId = req.user.id;
      }

      const conversations = await Conversation.list({
        status,
        agentId: targetAgentId,
        search,
        limit: parseInt(limit || '50', 10),
        offset: parseInt(offset || '0', 10)
      });

      return res.json({ conversations });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single conversation details
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const conversation = await Conversation.findById(id);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Check agent permission
      if (req.user.role === 'agent' && conversation.current_agent_id !== req.user.id) {
        return res.status(403).json({ error: 'You are not assigned to this conversation' });
      }

      const transferHistory = await TransferLog.findByConversation(id);

      return res.json({
        conversation,
        transferHistory
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get full message transcript for a conversation
   */
  static async getMessages(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;

      const conversation = await Conversation.findById(id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (req.user.role === 'agent' && conversation.current_agent_id !== req.user.id) {
        return res.status(403).json({ error: 'You are not assigned to this conversation' });
      }

      const messages = await Message.findByConversation(id, {
        limit: parseInt(limit || '100', 10),
        offset: parseInt(offset || '0', 10)
      });

      return res.json({ messages });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Close a conversation manually
   */
  static async close(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const conversation = await Conversation.findById(id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (req.user.role === 'agent' && conversation.current_agent_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only close your own conversations' });
      }

      const closed = await Conversation.close(id, req.user.id);

      // System audit message
      await Message.create({
        conversationId: id,
        senderType: 'system',
        content: `Chat closed by ${req.user.name}${reason ? ` (Reason: ${reason})` : ''}`
      });

      // Emit socket event if io is attached to app
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation_${id}`).emit('chat:closed', {
          conversationId: id,
          closedBy: req.user.name,
          closedAt: closed.closed_at,
          reason
        });
        io.emit('admin:dashboard_update', { event: 'conversation_closed', conversationId: id });
      }

      return res.json({ message: 'Conversation closed successfully', conversation: closed });
    } catch (err) {
      next(err);
    }
  }

  /**
   * KPI dashboard metrics
   */
  static async getKPISummary(req, res, next) {
    try {
      const kpis = await Conversation.getKPISummary();
      const onlineAgents = await PresenceService.getAvailableAgents();

      return res.json({
        ...kpis,
        onlineAgentsCount: onlineAgents.length
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ConversationController;
