// Adds the pages with live ads as real clients.
// account_id = Facebook Page ID (webhook.js resolveClientId matches on this).
// Run: node scripts/add-live-clients.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const clients = [
  {
    id: 'madras-crafters',
    name: 'Madras Crafters',
    industry: 'Construction',
    city: 'Chennai',
    color: '#F59E0B',
    icon: '🏗️',
    accountId: '1142957065575295', // Page ID
  },
  {
    id: 'sree-dhanalakshmi',
    name: 'Sree Dhanalakshmi Enterprises',
    industry: 'Building Materials',
    city: 'Chennai',
    color: '#10B981',
    icon: '🧱',
    accountId: '1092278530646107', // Page ID
  },
];

(async () => {
  for (const c of clients) {
    await pool.query(
      `INSERT INTO clients (id, name, industry, city, color, icon, account_id, forms, token_days, status, leads_today, cpl, conv_rate, total_leads, campaigns)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,60,'connected',0,0,0,0,0)
       ON CONFLICT (id) DO UPDATE SET name=$2, industry=$3, city=$4, account_id=$7`,
      [c.id, c.name, c.industry, c.city, c.color, c.icon, c.accountId]
    );
    console.log('✅ upserted', c.name);
  }
  const { rows } = await pool.query('SELECT id, name, account_id FROM clients ORDER BY name');
  console.table(rows);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
