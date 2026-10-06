const redis = require('../config/redis');
const db = require('../config/db');

const AGENT_PRESENCE_HASH = 'presence:agents';
const AGENT_SOCKETS_PREFIX = 'sockets:agent:';
const CONVERSATION_SOCKETS_PREFIX = 'sockets:conv:';

/**
 * Service to manage real-time online/busy/offline agent presence and socket mappings
 */
class PresenceService {
  /**
   * Set agent presence status
   */
  static async setAgentStatus(agentId, status, details = {}) {
    const record = {
      agentId,
      status, // 'online' | 'busy' | 'offline'
      name: details.name || '',
      email: details.email || '',
      updatedAt: new Date().toISOString()
    };

    await redis.hset(AGENT_PRESENCE_HASH, agentId, record);
    return record;
  }

  /**
   * Get agent presence status
   */
  static async getAgentStatus(agentId) {
    const fromRedis = await redis.hget(AGENT_PRESENCE_HASH, agentId);
    if (fromRedis && fromRedis.status) return fromRedis;
    try {
      const dbUser = await db.query('SELECT id, name, email, status FROM users WHERE id = $1', [agentId]);
      if (dbUser.rows && dbUser.rows[0]) {
        return {
          agentId,
          status: dbUser.rows[0].status || 'offline',
          name: dbUser.rows[0].name,
          email: dbUser.rows[0].email
        };
      }
    } catch (e) {
      // fallback fail-safe
    }
    return null;
  }

  /**
   * Get all active agent presences
   */
  static async getAllAgentPresences() {
    return await redis.hgetall(AGENT_PRESENCE_HASH);
  }

  /**
   * Get available (online and not busy) agents
   */
  static async getAvailableAgents() {
    const all = await this.getAllAgentPresences();
    const available = [];

    for (const [id, agent] of Object.entries(all)) {
      if (agent && agent.status === 'online') {
        available.push(agent);
      }
    }

    if (available.length === 0) {
      try {
        const dbOnline = await db.query(
          "SELECT id as \"agentId\", name, email, status FROM users WHERE role = 'agent' AND status = 'online'"
        );
        return dbOnline.rows || [];
      } catch (e) {
        // fallback fail-safe
      }
    }

    return available;
  }

  /**
   * Map agent socket ID
   */
  static async addAgentSocket(agentId, socketId) {
    const key = `${AGENT_SOCKETS_PREFIX}${agentId}`;
    const sockets = (await redis.get(key)) || [];
    if (!sockets.includes(socketId)) {
      sockets.push(socketId);
      await redis.set(key, sockets, 86400); // 24 hours
    }
  }

  /**
   * Remove agent socket ID
   */
  static async removeAgentSocket(agentId, socketId) {
    const key = `${AGENT_SOCKETS_PREFIX}${agentId}`;
    let sockets = (await redis.get(key)) || [];
    sockets = sockets.filter(id => id !== socketId);
    if (sockets.length > 0) {
      await redis.set(key, sockets, 86400);
    } else {
      await redis.del(key);
      // If agent has no remaining sockets, mark as offline
      const current = await this.getAgentStatus(agentId);
      if (current && current.status !== 'offline') {
        await this.setAgentStatus(agentId, 'offline', current);
      }
    }
  }

  /**
   * Map socket to conversation room
   */
  static async mapConversationSocket(conversationId, socketId) {
    const key = `${CONVERSATION_SOCKETS_PREFIX}${conversationId}`;
    const sockets = (await redis.get(key)) || [];
    if (!sockets.includes(socketId)) {
      sockets.push(socketId);
      await redis.set(key, sockets, 86400);
    }
  }

  /**
   * Remove socket from conversation room
   */
  static async unmapConversationSocket(conversationId, socketId) {
    const key = `${CONVERSATION_SOCKETS_PREFIX}${conversationId}`;
    let sockets = (await redis.get(key)) || [];
    sockets = sockets.filter(id => id !== socketId);
    if (sockets.length > 0) {
      await redis.set(key, sockets, 86400);
    } else {
      await redis.del(key);
    }
  }
}

module.exports = PresenceService;
