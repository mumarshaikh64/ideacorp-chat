const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ChatInvite {
  static async create({ token, customerPhone, agentId, expiresAt, campaignId = null, channel = 'sms' }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO chat_invites (id, token, customer_phone, agent_id, campaign_id, channel, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [id, token, customerPhone, agentId, campaignId, channel || 'sms', expiresAt]
    );

    return this.findById(id);
  }

  static async findById(id) {
    const res = await db.query(
      `SELECT ci.*, u.name as agent_name 
       FROM chat_invites ci
       LEFT JOIN users u ON ci.agent_id = u.id
       WHERE ci.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByToken(token) {
    const res = await db.query(
      `SELECT ci.*, u.name as agent_name, u.email as agent_email, u.status as agent_status
       FROM chat_invites ci
       LEFT JOIN users u ON ci.agent_id = u.id
       WHERE ci.token = $1`,
      [token]
    );
    return res.rows[0] || null;
  }

  static async markUsed(id, conversationId) {
    await db.query(
      `UPDATE chat_invites 
       SET used_at = CURRENT_TIMESTAMP, conversation_id = $1 
       WHERE id = $2`,
      [conversationId, id]
    );
    return this.findById(id);
  }

  static async list({ limit = 50, offset = 0 } = {}) {
    const res = await db.query(
      `SELECT ci.*, u.name as agent_name 
       FROM chat_invites ci
       LEFT JOIN users u ON ci.agent_id = u.id
       ORDER BY ci.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  }
}

module.exports = ChatInvite;
