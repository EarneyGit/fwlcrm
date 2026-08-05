require('dotenv').config();
const { createPgPool } = require('./_script_env');

const pool = createPgPool();

async function migrate() {
  console.log('Adding Google attribution columns to leads table...');
  try {
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50) DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS gclid TEXT,
      ADD COLUMN IF NOT EXISTS gbraid TEXT,
      ADD COLUMN IF NOT EXISTS wbraid TEXT,
      ADD COLUMN IF NOT EXISTS google_campaign_id TEXT,
      ADD COLUMN IF NOT EXISTS google_campaign_name TEXT,
      ADD COLUMN IF NOT EXISTS google_ad_group_id TEXT,
      ADD COLUMN IF NOT EXISTS google_ad_group_name TEXT,
      ADD COLUMN IF NOT EXISTS google_ad_id TEXT,
      ADD COLUMN IF NOT EXISTS google_ad_name TEXT,
      ADD COLUMN IF NOT EXISTS google_click_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS google_conversion_uploaded_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS google_conversion_status TEXT,
      ADD COLUMN IF NOT EXISTS google_conversion_error TEXT;
    `);
    console.log('✅ Google attribution migration successful.');
  } catch (error) {
    console.error('Error migrating DB:', error);
  } finally {
    pool.end();
  }
}

migrate();
