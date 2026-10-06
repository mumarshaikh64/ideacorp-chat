const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Conversation {
  static async findById(id) {
    const sql = `
      SELECT 
        c.id, c.status, c.created_at, c.closed_at, c.closed_by,
        c.handling_mode, c.handoff_requested, c.handoff_reason,
        c.customer_id, cust.name as customer_name, cust.phone as customer_phone, cust.notes as customer_notes,
        c.current_agent_id, u.name as current_agent_name, u.email as current_agent_email,
        COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN users u ON c.current_agent_id = u.id
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.id = $1
      GROUP BY c.id, cust.id, u.id
    `;
    const res = await db.query(sql, [id]);
    return res.rows[0] || null;
  }

  static async create({ customerId, currentAgentId, status = 'open', handlingMode = 'ai' }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO conversations (id, customer_id, current_agent_id, status, handling_mode, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [id, customerId, currentAgentId, status, handlingMode]
    );

    return this.findById(id);
  }

  static async setHandlingMode(id, handlingMode, { handoffRequested = null, handoffReason = null } = {}) {
    const updates = ['handling_mode = $1'];
    const values = [handlingMode];
    let idx = 2;

    if (handoffRequested !== null) {
      updates.push(`handoff_requested = $${idx++}`);
      values.push(handoffRequested ? 1 : 0);
    }
    if (handoffReason !== null) {
      updates.push(`handoff_reason = $${idx++}`);
      values.push(handoffReason);
    }

    values.push(id);
    await db.query(
      `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );
    return this.findById(id);
  }

  static async updateAgent(id, newAgentId) {
    await db.query(
      `UPDATE conversations SET current_agent_id = $1 WHERE id = $2`,
      [newAgentId, id]
    );
    return this.findById(id);
  }

  static async close(id, closedByUserId = null) {
    await db.query(
      `UPDATE conversations SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = $1 WHERE id = $2`,
      [closedByUserId, id]
    );
    return this.findById(id);
  }

  static async list({ status, agentId, customerId, search, limit = 50, offset = 0 } = {}) {
    const where = [];
    const values = [];
    let idx = 1;

    if (status) {
      where.push(`c.status = $${idx++}`);
      values.push(status);
    }
    if (agentId) {
      where.push(`c.current_agent_id = $${idx++}`);
      values.push(agentId);
    }
    if (customerId) {
      where.push(`c.customer_id = $${idx++}`);
      values.push(customerId);
    }
    if (search) {
      where.push(`(cust.name ILIKE $${idx} OR cust.phone ILIKE $${idx} OR u.name ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT 
        c.id, c.status, c.created_at, c.closed_at, c.closed_by,
        c.handling_mode, c.handoff_requested, c.handoff_reason,
        c.customer_id, cust.name as customer_name, cust.phone as customer_phone,
        c.current_agent_id, u.name as current_agent_name,
        (
          SELECT content FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT created_at FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_at,
        (
          SELECT COUNT(*) FROM messages 
          WHERE conversation_id = c.id
        ) as message_count
      FROM conversations c
      LEFT JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN users u ON c.current_agent_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const res = await db.query(sql, values);
    return res.rows;
  }

  static async getActiveConversationsForAgent(agentId) {
    return this.list({ agentId, status: 'open' });
  }

  static async getKPISummary() {
    const totalRes = await db.query('SELECT COUNT(*) as count FROM conversations');
    const openRes = await db.query("SELECT COUNT(*) as count FROM conversations WHERE status = 'open'");
    const closedRes = await db.query("SELECT COUNT(*) as count FROM conversations WHERE status = 'closed'");
    const todayRes = await db.query(
      "SELECT COUNT(*) as count FROM conversations WHERE created_at >= CURRENT_DATE"
    );

    return {
      totalConversations: parseInt(totalRes.rows[0].count, 10),
      openConversations: parseInt(openRes.rows[0].count, 10),
      closedConversations: parseInt(closedRes.rows[0].count, 10),
      todayConversations: parseInt(todayRes.rows[0].count, 10)
    };
  }
}

module.exports = Conversation;
