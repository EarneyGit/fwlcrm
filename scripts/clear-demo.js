// ============================================================
// FWL CRM — Clear Demo Data & Seed Real Production Data
// Run: node scripts/clear-demo.js
// ============================================================

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearAndSeed() {
  console.log('🔌 Connecting to Neon DB...');
  try {
    // Clear all demo data (safe — no DROP TABLE)
    await pool.query('DELETE FROM activities');
    console.log('✅ Activities cleared.');
    await pool.query('DELETE FROM leads');
    console.log('✅ Leads cleared.');
    await pool.query('DELETE FROM clients');
    console.log('✅ Clients cleared.');
    await pool.query('DELETE FROM agents');
    console.log('✅ Agents cleared.');

    // ── Insert real client: Earney ───────────────────────────
    await pool.query(`
      INSERT INTO clients
        (id, name, industry, city, color, icon, account_id, forms,
         token_days, status, leads_today, cpl, conv_rate, total_leads, campaigns)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `, [
      'earney',
      'Earney Digital Service Solutions',
      'Digital Marketing',
      'Chennai',
      '#1877F2',
      '📣',
      'act_898186284241803',
      0,    // forms — will update when lead forms are fetched
      60,   // token_days — page token is long-lived
      'connected',
      0,    // leads_today — real-time from webhook
      0,    // cpl — will be computed from real data
      0,    // conv_rate — will be computed from real data
      0,    // total_leads — will grow via webhook
      0     // campaigns
    ]);
    console.log('✅ Real client (Earney Digital Service Solutions) inserted.');

    // ── Insert real agent: Kawin ─────────────────────────────
    await pool.query(`
      INSERT INTO agents (id, name, initials, color, role, email, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      'kawin',
      'Kawin',
      'KW',
      '#1877F2',
      'Owner',
      'kaviarasu1230@gmail.com',
      'active'
    ]);
    console.log('✅ Real agent (Kawin, Owner) inserted.');

    console.log('');
    console.log('🎉 Database is now clean and ready for live production!');
    console.log('   → Leads will populate automatically via Meta webhook');
    console.log('   → Test with: developers.facebook.com/tools/lead-ads-testing');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearAndSeed();
