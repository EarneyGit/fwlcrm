require('dotenv').config();
const { createPgPool } = require('./_script_env');

const pool = createPgPool();

async function migrate() {
  console.log('Adding Google conversion config columns to clients table...');
  try {
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS google_conversion_action_id TEXT,
      ADD COLUMN IF NOT EXISTS google_conversion_action_name TEXT;
    `);
    console.log('✅ Google conversion config migration successful.');
  } catch (error) {
    console.error('Error migrating DB:', error);
  } finally {
    pool.end();
  }
}

migrate();
