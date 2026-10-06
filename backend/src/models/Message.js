const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Message {
  static async create({
    conversationId,
    senderType, // 'customer' | 'agent' | 'system' | 'bot'
    senderId = null,
    content,
    messageType = 'text', // 'text' | 'image' | 'file' | 'quick_option' | 'bot'
    fileUrl = null,
    status = 'sent', // 'sent' | 'delivered' | 'read'
    metadata = null
  }) {
    const id = uuidv4();
    const metaStr = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;
    await db.query(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, message_type, file_url, status, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [id, conversationId, senderType, senderId, content, messageType, fileUrl, status, metaStr]
    );

    const res = await db.query('SELECT * FROM messages WHERE id = $1', [id]);
    return res.rows[0];
  }

  static async findById(id) {
    const res = await db.query('SELECT * FROM messages WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findByConversation(conversationId, { limit = 100, offset = 0 } = {}) {
    const sql = `
      SELECT 
        m.*,
        u.name as agent_name
      FROM messages m
      LEFT JOIN users u ON m.sender_type = 'agent' AND m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3
    `;
    const res = await db.query(sql, [conversationId, limit, offset]);
    return res.rows.map(row => {
      let parsedMeta = null;
      if (row.metadata) {
        try {
          parsedMeta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        } catch (e) {
          parsedMeta = null;
        }
      }
      return {
        ...row,
        metadata: parsedMeta
      };
    });
  }

  static async updateStatus(id, status) {
    await db.query('UPDATE messages SET status = $1 WHERE id = $2', [status, id]);
    return this.findById(id);
  }

  static async markConversationDelivered(conversationId, recipientType) {
    // If recipient is customer, mark all agent messages as delivered
    // If recipient is agent, mark all customer messages as delivered
    const senderTypeToUpdate = recipientType === 'customer' ? 'agent' : 'customer';

    await db.query(
      `UPDATE messages 
       SET status = 'delivered' 
       WHERE conversation_id = $1 
         AND sender_type = $2 
         AND status = 'sent'`,
      [conversationId, senderTypeToUpdate]
    );
  }

  static async markConversationRead(conversationId, readerType) {
    const senderTypeToUpdate = readerType === 'customer' ? 'agent' : 'customer';

    await db.query(
      `UPDATE messages 
       SET status = 'read' 
       WHERE conversation_id = $1 
         AND sender_type = $2 
         AND status IN ('sent', 'delivered')`,
      [conversationId, senderTypeToUpdate]
    );
  }
}

module.exports = Message;
