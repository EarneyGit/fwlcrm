// ============================================================
// FWL CRM - WhatsApp module migration (additive, idempotent)
// Run locally: node scripts/migrate-whatsapp.js
// Safe to run multiple times. Never drops or rewrites data.
//
// Note: api/_whatsapp.js also self-migrates on first webhook
// hit, so running this manually is optional but recommended.
// ============================================================
require('dotenv').config();

// Reuse the exact same DDL the runtime uses - single source of truth
const path = require('path');
const fs = require('fs');
const src = fs.readFileSync(path.join(__dirname, '..', 'api', '_whatsapp.js'), 'utf8');
const match = src.match(/const SCHEMA_SQL = `([\s\S]*?)`;/);
if (!match) { console.error('Could not extract SCHEMA_SQL from api/_whatsapp.js'); process.exit(1); }
const SCHEMA_SQL = match[1];

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  console.log('Applying WhatsApp module schema...');
  await pool.query(SCHEMA_SQL);
  console.log('OK - tables: whatsapp_accounts, whatsapp_conversations, whatsapp_messages,');
  console.log('     whatsapp_templates, webhook_event_logs, lead_stage_history, followups');
  console.log('OK - leads columns added: tags, wa_id, next_followup_at');

  // Seed default WhatsApp account rows (edit phone_number_id after Meta setup)
  const seed = [
    { id: 'wa-earney', client: 'earney', name: 'Earney Digital Service Solutions' },
  ];
  for (const s of seed) {
    await pool.query(`
      INSERT INTO whatsapp_accounts (id, client_id, display_name, status)
      VALUES ($1, $2, $3, 'pending')
      ON CONFLICT (id) DO NOTHING
    `, [s.id, s.client, s.name]);
  }
  console.log('OK - seeded whatsapp_accounts placeholder (set phone_number_id + waba_id after Meta setup)');

  const { rows } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'whatsapp%' OR table_name IN ('webhook_event_logs','lead_stage_history','followups')
    ORDER BY table_name
  `);
  console.table(rows);
  await pool.end();
})().catch(e => { console.error('MIGRATION FAILED:', e.message); process.exit(1); });
