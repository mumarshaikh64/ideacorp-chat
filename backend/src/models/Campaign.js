const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Campaign {
  static async create({ name, agentId, totalCount = 0, template = '', channel = 'sms', status = 'processing' }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO campaigns (id, name, agent_id, total_count, sent_count, failed_count, status, channel, template, created_at)
       VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [id, name, agentId, totalCount, status, channel || 'sms', template]
    );

    return this.findById(id);
  }

  static async findById(id) {
    const sql = `
      SELECT 
        c.*, 
        u.name as agent_name,
        (SELECT COUNT(*) FROM chat_invites WHERE campaign_id = c.id AND used_at IS NOT NULL) as chats_initiated
      FROM campaigns c
      LEFT JOIN users u ON c.agent_id = u.id
      WHERE c.id = $1
    `;
    const res = await db.query(sql, [id]);
    return res.rows[0] || null;
  }

  static async updateCounts(id, { sentCount, failedCount, status = 'completed' }) {
    await db.query(
      `UPDATE campaigns 
       SET sent_count = $1, failed_count = $2, status = $3 
       WHERE id = $4`,
      [sentCount, failedCount, status, id]
    );
    return this.findById(id);
  }

  static async list({ limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT 
        c.*, 
        u.name as agent_name,
        (SELECT COUNT(*) FROM chat_invites WHERE campaign_id = c.id AND used_at IS NOT NULL) as chats_initiated
      FROM campaigns c
      LEFT JOIN users u ON c.agent_id = u.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const res = await db.query(sql, [limit, offset]);
    return res.rows;
  }

  static async getRecipients(campaignId, { limit = 100, offset = 0 } = {}) {
    const sql = `
      SELECT 
        ci.*,
        cust.name as customer_name,
        cust.notes as customer_notes,
        cv.status as conversation_status
      FROM chat_invites ci
      LEFT JOIN customers cust ON ci.customer_phone = cust.phone
      LEFT JOIN conversations cv ON ci.conversation_id = cv.id
      WHERE ci.campaign_id = $1
      ORDER BY ci.created_at ASC
      LIMIT $2 OFFSET $3
    `;
    const res = await db.query(sql, [campaignId, limit, offset]);
    return res.rows;
  }
}

module.exports = Campaign;
