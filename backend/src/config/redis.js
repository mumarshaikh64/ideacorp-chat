/**
 * Redis Client & Adapter Configuration
 * 
 * Provides:
 * - Redis client connection with automatic reconnection.
 * - Pub/Sub client pairs for Socket.IO Redis adapter horizontal scaling.
 * - Transparent in-memory fallback if Redis is offline during local development.
 */

const { createClient } = require('redis');
const env = require('./env');

let redisClient = null;
let pubClient = null;
let subClient = null;
let isRedisConnected = false;

// In-memory fallback cache when Redis is unavailable
const memoryCache = new Map();
const memoryHashes = new Map();

async function initRedis() {
  if (!env.USE_REDIS) {
    console.log('[Redis] USE_REDIS is disabled in environment. Using in-memory store.');
    return { isConnected: false };
  }

  try {
    const url = `redis://${env.REDIS_PASSWORD ? `:${env.REDIS_PASSWORD}@` : ''}${env.REDIS_HOST}:${env.REDIS_PORT}`;

    redisClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.warn('[Redis] Max reconnection attempts reached. Continuing with in-memory adapter fallback.');
            return false;
          }
          return Math.min(retries * 500, 2000);
        }
      }
    });

    redisClient.on('error', (err) => {
      if (!isRedisConnected) {
        // Suppress repeated logs before first connect
        return;
      }
      console.warn('[Redis Error]', err.message);
    });

    redisClient.on('ready', () => {
      isRedisConnected = true;
      console.log(`[Redis] Connected successfully to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
    });

    await redisClient.connect();

    // Create Pub/Sub clients for Socket.IO horizontal scaling
    pubClient = redisClient.duplicate();
    subClient = redisClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('[Redis] Pub/Sub clients initialized for Socket.IO adapter.');

    isRedisConnected = true;
    return { isConnected: true, client: redisClient, pubClient, subClient };
  } catch (err) {
    console.warn(`[Redis] Failed to connect to Redis (${err.message}). Using in-memory presence and session map.`);
    isRedisConnected = false;
    return { isConnected: false };
  }
}

// Key-Value Storage Helpers
async function get(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  return memoryCache.get(key) || null;
}

async function set(key, value, ttlSeconds = null) {
  const serialized = JSON.stringify(value);
  if (isRedisConnected && redisClient) {
    try {
      if (ttlSeconds) {
        await redisClient.set(key, serialized, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch {
      // Fallback to memory
    }
  }

  memoryCache.set(key, value);
  if (ttlSeconds) {
    setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
  }
  return true;
}

async function del(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return true;
    } catch {
      // Fallback
    }
  }
  return memoryCache.delete(key);
}

// Hash Storage Helpers (useful for Agent Presence: agent_id -> details)
async function hset(hashKey, field, value) {
  const serialized = JSON.stringify(value);
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.hSet(hashKey, field, serialized);
      return true;
    } catch {
      // Fallback
    }
  }

  if (!memoryHashes.has(hashKey)) {
    memoryHashes.set(hashKey, new Map());
  }
  memoryHashes.get(hashKey).set(field, value);
  return true;
}

async function hget(hashKey, field) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.hGet(hashKey, field);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  const hash = memoryHashes.get(hashKey);
  return hash ? hash.get(field) || null : null;
}

async function hgetall(hashKey) {
  if (isRedisConnected && redisClient) {
    try {
      const raw = await redisClient.hGetAll(hashKey);
      const parsed = {};
      for (const [k, v] of Object.entries(raw || {})) {
        try {
          parsed[k] = JSON.parse(v);
        } catch {
          parsed[k] = v;
        }
      }
      return parsed;
    } catch {
      // Fallback
    }
  }

  const hash = memoryHashes.get(hashKey);
  if (!hash) return {};
  const result = {};
  for (const [k, v] of hash.entries()) {
    result[k] = v;
  }
  return result;
}

async function hdel(hashKey, field) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.hDel(hashKey, field);
      return true;
    } catch {
      // Fallback
    }
  }

  const hash = memoryHashes.get(hashKey);
  if (hash) {
    return hash.delete(field);
  }
  return false;
}

module.exports = {
  initRedis,
  getRedisClient: () => redisClient,
  getPubSubClients: () => ({ pubClient, subClient }),
  isRedisActive: () => isRedisConnected,
  get,
  set,
  del,
  hset,
  hget,
  hgetall,
  hdel
};
