const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigrations() {
  console.log('[Migration] Starting database migration...');
  
  try {
    await db.initDB();

    const sqlPath = path.join(__dirname, '001_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    if (!db.isSqlite()) {
      // Postgres execution
      await db.query(sql);
      console.log('[Migration] Successfully executed PostgreSQL migration 001_initial_schema.sql');
    } else {
      console.log('[Migration] SQLite fallback mode: schema applied via initDB()');
    }

    console.log('[Migration] All migrations completed successfully.');
  } catch (err) {
    console.error('[Migration Error]', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations().then(() => {
    process.exit(0);
  });
}

module.exports = runMigrations;
