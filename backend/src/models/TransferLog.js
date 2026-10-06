const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class TransferLog {
  static async create({ conversationId, fromAgentId, toAgentId, reason = null }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO transfer_logs (id, conversation_id, from_agent_id, to_agent_id, reason, transferred_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [id, conversationId, fromAgentId, toAgentId, reason]
    );

    return this.findById(id);
  }

  static async findById(id) {
    const res = await db.query(
      `SELECT tl.*, 
              u1.name as from_agent_name, 
              u2.name as to_agent_name
       FROM transfer_logs tl
       LEFT JOIN users u1 ON tl.from_agent_id = u1.id
       LEFT JOIN users u2 ON tl.to_agent_id = u2.id
       WHERE tl.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByConversation(conversationId) {
    const res = await db.query(
      `SELECT tl.*, 
              u1.name as from_agent_name, 
              u2.name as to_agent_name
       FROM transfer_logs tl
       LEFT JOIN users u1 ON tl.from_agent_id = u1.id
       LEFT JOIN users u2 ON tl.to_agent_id = u2.id
       WHERE tl.conversation_id = $1
       ORDER BY tl.transferred_at ASC`,
      [conversationId]
    );
    return res.rows;
  }
}

class AgentStatusLog {
  static async log({ agentId, status }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO agent_status_logs (id, agent_id, status, changed_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [id, agentId, status]
    );
    return { id, agentId, status };
  }

  static async getHistory(agentId, limit = 50) {
    const res = await db.query(
      `SELECT * FROM agent_status_logs WHERE agent_id = $1 ORDER BY changed_at DESC LIMIT $2`,
      [agentId, limit]
    );
    return res.rows;
  }
}

module.exports = {
  TransferLog,
  AgentStatusLog
};
