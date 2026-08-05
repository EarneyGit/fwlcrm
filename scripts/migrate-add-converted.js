require('dotenv').config();
const { createPgPool } = require('./_script_env');

const pool = createPgPool();

async function migrate() {
  console.log("Adding converted_at and conversion_value to leads table...");
  try {
    await pool.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ, 
      ADD COLUMN IF NOT EXISTS conversion_value NUMERIC(10,2);
    `);
    console.log("✅ Migration successful.");
  } catch (error) {
    console.error("Error migrating DB:", error);
  } finally {
    pool.end();
  }
}

migrate();
