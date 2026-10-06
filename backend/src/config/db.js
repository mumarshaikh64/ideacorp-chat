/**
 * Database Connection & Query Interface
 * 
 * Supports native PostgreSQL via 'pg' connection pool.
 * If PostgreSQL is unreachable and DB_FALLBACK_SQLITE is true, seamlessly
 * falls back to an embedded SQLite database for immediate local development.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('./env');

let pool = null;
let sqliteDb = null;
let isUsingSqlite = false;

// Initialize PostgreSQL Pool
function createPgPool() {
  return new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionTimeoutMillis: 3000,
    max: 20,
    idleTimeoutMillis: 30000,
  });
}

/**
 * Initializes SQLite fallback if Postgres is unavailable
 */
function initSqliteFallback() {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'ideacrop_chat.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);
    isUsingSqlite = true;
    console.log(`[DB] Connected to SQLite local fallback at: ${dbPath}`);
    return true;
  } catch (err) {
    console.warn('[DB] SQLite3 module not available, running in-memory fallback store:', err.message);
    initMemoryFallback();
    isUsingSqlite = true;
    return true;
  }
}

// In-memory store fallback if sqlite3 is not compiled
let memoryTables = {};
function initMemoryFallback() {
  memoryTables = {
    users: [],
    customers: [],
    conversations: [],
    messages: [],
    chat_invites: [],
    transfer_logs: [],
    agent_status_logs: [],
    system_settings: []
  };
}

/**
 * Connect and verify DB availability
 */
async function initDB() {
  try {
    pool = createPgPool();
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time');
    client.release();
    console.log(`[DB] Successfully connected to PostgreSQL at ${env.DB_HOST}:${env.DB_PORT} (time: ${res.rows[0].current_time})`);
    isUsingSqlite = false;
    return { type: 'postgres', pool };
  } catch (err) {
    console.warn(`[DB] Could not connect to PostgreSQL (${err.message}).`);
    if (env.DB_FALLBACK_SQLITE) {
      console.log('[DB] Activating fallback database adapter for local development...');
      initSqliteFallback();
      await runSqliteSchema();
      return { type: 'sqlite', db: sqliteDb };
    } else {
      throw err;
    }
  }
}

/**
 * Convert Postgres parameter style ($1, $2) to SQLite (?)
 */
function pgToSqliteQuery(text, params = []) {
  const convertedParams = [];
  const convertedText = text
    .replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME')
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";?/gi, '')
    .replace(/\bILIKE\b/gi, 'LIKE')
    .replace(/EXTRACT\(EPOCH FROM \(([^)]+)\)\)/gi, 'strftime("%s", $1)')
    .replace(/\$([0-9]+)/g, (match, p1) => {
      const idx = parseInt(p1, 10) - 1;
      convertedParams.push(params[idx]);
      return '?';
    });

  return { convertedText, params: convertedParams };
}

/**
 * Execute query against active database (Postgres or SQLite fallback)
 */
async function query(text, params = []) {
  if (!isUsingSqlite && pool) {
    return pool.query(text, params);
  }

  // SQLite execution fallback
  if (sqliteDb) {
    return new Promise((resolve, reject) => {
      const { convertedText, params: convertedParams } = pgToSqliteQuery(text, params);
      const trimmed = convertedText.trim();
      const isSelect = /^SELECT/i.test(trimmed);

      if (isSelect) {
        sqliteDb.all(convertedText, convertedParams, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: rows || [], rowCount: (rows || []).length });
        });
      } else {
        sqliteDb.run(convertedText, convertedParams, function (err) {
          if (err) return reject(err);
          resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
        });
      }
    });
  }

  throw new Error('Database is not initialized');
}

/**
 * Execute schema for SQLite fallback
 */
async function runSqliteSchema() {
  if (!sqliteDb) return;
  const schemaFile = path.join(__dirname, '../migrations/001_initial_schema.sql');
  if (!fs.existsSync(schemaFile)) return;

  const rawSql = fs.readFileSync(schemaFile, 'utf8');
  // Strip line comments
  const cleanSql = rawSql.replace(/--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      const { convertedText } = pgToSqliteQuery(stmt);
      if (!convertedText || convertedText.trim().length === 0) continue;
      await new Promise((res, rej) => {
        sqliteDb.run(convertedText, err => {
          if (err && !err.message.includes('already exists')) {
            console.warn('[DB Fallback Schema Notice]', err.message, 'in stmt:', convertedText.slice(0, 50));
          }
          res();
        });
      });
    } catch (e) {
      // Continue next statement
    }
  }

  // Ensure channel columns exist on existing databases
  const alterStatements = [
    `ALTER TABLE campaigns ADD COLUMN channel VARCHAR(32) DEFAULT 'sms'`,
    `ALTER TABLE chat_invites ADD COLUMN channel VARCHAR(32) DEFAULT 'sms'`
  ];
  for (const alterStmt of alterStatements) {
    await new Promise((res) => {
      sqliteDb.run(alterStmt, () => res());
    });
  }
}

module.exports = {
  initDB,
  query,
  getPool: () => pool,
  isSqlite: () => isUsingSqlite
};
