const db = require('../config/db');

class ReportController {
  /**
   * Aggregate analytics for reports dashboard
   */
  static async getAnalytics(req, res, next) {
    try {
      // 1. Total chat volume by status
      const statusCounts = await db.query(`
        SELECT status, COUNT(*) as count 
        FROM conversations 
        GROUP BY status
      `);

      // 2. Chat volume breakdown per agent
      const agentPerformance = await db.query(`
        SELECT 
          u.id as agent_id,
          u.name as agent_name,
          u.email as agent_email,
          COUNT(c.id) as total_chats,
          SUM(CASE WHEN c.status = 'closed' THEN 1 ELSE 0 END) as closed_chats,
          SUM(CASE WHEN c.status = 'open' THEN 1 ELSE 0 END) as active_chats,
          COALESCE(
            ROUND(AVG(
              CASE WHEN c.closed_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (c.closed_at - c.created_at)) / 60 
              ELSE NULL END
            ), 1), 0
          ) as avg_handling_minutes
        FROM users u
        LEFT JOIN conversations c ON u.id = c.current_agent_id
        WHERE u.role = 'agent'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_chats DESC
      `);

      // 3. Message breakdown
      const messageStats = await db.query(`
        SELECT 
          sender_type,
          COUNT(*) as count
        FROM messages
        GROUP BY sender_type
      `);

      // 4. Invites conversion metric (total sent vs used)
      const inviteMetrics = await db.query(`
        SELECT 
          COUNT(*) as total_invites,
          SUM(CASE WHEN used_at IS NOT NULL THEN 1 ELSE 0 END) as used_invites
        FROM chat_invites
      `);

      const totalInvites = parseInt(inviteMetrics.rows[0]?.total_invites || 0, 10);
      const usedInvites = parseInt(inviteMetrics.rows[0]?.used_invites || 0, 10);
      const conversionRate = totalInvites > 0 ? ((usedInvites / totalInvites) * 100).toFixed(1) : '0.0';

      return res.json({
        statusCounts: statusCounts.rows,
        agentPerformance: agentPerformance.rows,
        messageStats: messageStats.rows,
        conversion: {
          totalInvites,
          usedInvites,
          conversionRate: `${conversionRate}%`
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Export conversation logs as downloadable CSV
   */
  static async exportConversationsCSV(req, res, next) {
    try {
      const sql = `
        SELECT 
          c.id as conversation_id,
          c.status,
          cust.name as customer_name,
          cust.phone as customer_phone,
          u.name as agent_name,
          u.email as agent_email,
          c.created_at,
          c.closed_at,
          COUNT(m.id) as message_count
        FROM conversations c
        LEFT JOIN customers cust ON c.customer_id = cust.id
        LEFT JOIN users u ON c.current_agent_id = u.id
        LEFT JOIN messages m ON c.id = m.conversation_id
        GROUP BY c.id, cust.name, cust.phone, u.name, u.email
        ORDER BY c.created_at DESC
      `;
      const result = await db.query(sql);

      // Construct CSV
      const headers = ['Conversation ID', 'Status', 'Customer Name', 'Customer Phone', 'Agent Name', 'Agent Email', 'Created At', 'Closed At', 'Message Count'];
      const rows = result.rows.map(r => [
        r.conversation_id,
        r.status,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        `"${(r.customer_phone || '').replace(/"/g, '""')}"`,
        `"${(r.agent_name || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(r.agent_email || '').replace(/"/g, '""')}"`,
        r.created_at ? new Date(r.created_at).toISOString() : '',
        r.closed_at ? new Date(r.closed_at).toISOString() : '',
        r.message_count || 0
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="conversations_export_${Date.now()}.csv"`);
      return res.send(csvContent);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;
