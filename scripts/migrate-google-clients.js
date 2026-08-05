require('dotenv').config();
const { createPgPool } = require('./_script_env');

const pool = createPgPool();

async function migrate() {
  console.log('Adding Google Ads client config columns...');
  try {
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS google_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS google_ads_enabled BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Google client config migration successful.');
  } catch (error) {
    console.error('Error migrating DB:', error);
  } finally {
    pool.end();
  }
}

migrate();
