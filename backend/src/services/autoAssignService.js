const db = require('../config/db');
const PresenceService = require('./presenceService');

/**
 * Service to automatically assign incoming chats based on routing policies
 * (Least-Busy or Round-Robin)
 */
class AutoAssignService {
  /**
   * Find the best agent for an incoming conversation
   * @param {string} [preferredAgentId] - If an agent sent the invite, strictly lock to that agent
   * @param {string} [algorithm='least_busy'] - 'least_busy' or 'round_robin'
   */
  static async findAvailableAgent(preferredAgentId = null, algorithm = 'least_busy') {
    // 1. Strict Sender-Agent Binding:
    // If an agent sent the invite, ALWAYS assign to them so the lead stays with that sales agent.
    if (preferredAgentId) {
      return preferredAgentId;
    }

    // 2. Fetch all online agents from Redis presence map for unassigned pool
    const onlinePresences = await PresenceService.getAvailableAgents();
    if (onlinePresences.length === 0) {
      // Fallback: check database for any online agent if presence map is cold
      const dbOnline = await db.query(
        "SELECT id FROM users WHERE role = 'agent' AND status = 'online' ORDER BY updated_at ASC"
      );
      if (dbOnline.rows.length > 0) {
        return dbOnline.rows[0].id;
      }
      return null;
    }

    const onlineAgentIds = onlinePresences.map(p => p.agentId);

    // 3. Least-busy routing: count active open conversations per agent
    if (algorithm === 'least_busy') {
      const agentLoads = await db.query(`
        SELECT current_agent_id as agent_id, COUNT(*) as open_count
        FROM conversations
        WHERE status = 'open' AND current_agent_id IS NOT NULL
        GROUP BY current_agent_id
      `);

      const loadMap = new Map();
      onlineAgentIds.forEach(id => loadMap.set(id, 0));
      agentLoads.rows.forEach(row => {
        if (loadMap.has(row.agent_id)) {
          loadMap.set(row.agent_id, parseInt(row.open_count, 10));
        }
      });

      // Find agent with minimum load
      let bestAgentId = onlineAgentIds[0];
      let minLoad = Infinity;

      for (const [id, count] of loadMap.entries()) {
        if (count < minLoad) {
          minLoad = count;
          bestAgentId = id;
        }
      }

      return bestAgentId;
    }

    // 4. Default: Round-robin or first available
    return onlineAgentIds[0];
  }
}

module.exports = AutoAssignService;
