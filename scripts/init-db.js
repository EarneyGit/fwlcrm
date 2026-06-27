require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const clients = [
  { id:'c1', name:'Prestige Builders', industry:'Real Estate', city:'Chennai', color:'#1877F2', icon:'🏠', accountId:'act_1234567890', forms:4, tokenDays:42, status:'connected', leadsToday:18, cpl:870, convRate:4.2, totalLeads:1240, campaigns:6 },
  { id:'c2', name:'Velammal Schools', industry:'Education', city:'Chennai', color:'#6C47FF', icon:'🎓', accountId:'act_9876543210', forms:3, tokenDays:8, status:'warning', leadsToday:34, cpl:310, convRate:6.8, totalLeads:2890, campaigns:4 },
  { id:'c3', name:'Sri Balaji Hospitals', industry:'Healthcare', city:'Coimbatore', color:'#10B981', icon:'🏥', accountId:'act_1122334455', forms:2, tokenDays:55, status:'connected', leadsToday:12, cpl:580, convRate:9.1, totalLeads:890, campaigns:3 },
  { id:'c4', name:'NxtGen Academy', industry:'EdTech', city:'Madurai', color:'#F59E0B', icon:'💻', accountId:'act_5566778899', forms:5, tokenDays:0, status:'error', leadsToday:0, cpl:420, convRate:3.5, totalLeads:560, campaigns:7 },
  { id:'c5', name:'Kotak Mahindra Finance', industry:'BFSI', city:'Chennai', color:'#EF4444', icon:'🏦', accountId:'act_6677889900', forms:3, tokenDays:29, status:'connected', leadsToday:22, cpl:1200, convRate:2.1, totalLeads:3100, campaigns:5 },
];

const campaigns = [
  'Anna Nagar Premium Homes', 'OMR IT Corridor Apartments', 'NEET 2026 Coaching',
  'JEE Advanced Crash Course', 'Personal Loan Chennai', 'Health Insurance Q2',
];

const firstNames = ['Priya','Karthik','Deepa','Suresh','Anitha','Rajesh','Kavitha','Murugan','Lakshmi','Vijay','Sangeetha','Ramesh','Saranya','Senthil','Divya','Arun','Padma','Manoj','Rekha','Dinesh'];
const lastNames = ['Kumar','Krishnan','Rajan','Perumal','Sundaram','Iyer','Murugesan','Venkat','Subramaniam','Natarajan','Srinivasan','Pillai'];
const cities = ['Chennai','Coimbatore','Madurai','Trichy','Salem','Vellore'];
const statuses = ['new','new','new','contacted','contacted','qualified','qualified','won','lost','nurture'];
const sources = ['facebook','facebook','instagram'];

function generateLeads(count) {
  const leads = [];
  for (let i = 0; i < count; i++) {
    const fn = firstNames[Math.floor(Math.random()*firstNames.length)];
    const ln = lastNames[Math.floor(Math.random()*lastNames.length)];
    const client = clients[Math.floor(Math.random()*clients.length)];
    const date = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    
    leads.push({
      id: `l_${Date.now()}_${i}`,
      leadgen_id: `ad_${Math.floor(Math.random()*1000000000)}`,
      name: `${fn} ${ln}`,
      first_name: fn,
      last_name: ln,
      phone: `+9198${Math.floor(10000000 + Math.random()*89999999)}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@gmail.com`,
      city: cities[Math.floor(Math.random()*cities.length)],
      status: statuses[Math.floor(Math.random()*statuses.length)],
      source: sources[Math.floor(Math.random()*sources.length)],
      client_id: client.id,
      campaign: campaigns[Math.floor(Math.random()*campaigns.length)],
      ad_id: `ad_${Math.floor(Math.random()*10000)}`,
      created_at: date.toISOString(),
      sla_breached: false
    });
  }
  return leads.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
}

async function initDB() {
  console.log("Connecting to Neon DB...");
  try {
    await pool.query(`
      DROP TABLE IF EXISTS activities;
      DROP TABLE IF EXISTS leads;
      DROP TABLE IF EXISTS clients;

      CREATE TABLE clients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        city VARCHAR(100),
        color VARCHAR(20),
        icon VARCHAR(20),
        account_id VARCHAR(100),
        forms INT DEFAULT 0,
        token_days INT DEFAULT 0,
        status VARCHAR(50),
        leads_today INT DEFAULT 0,
        cpl DECIMAL(10, 2),
        conv_rate DECIMAL(5, 2),
        total_leads INT DEFAULT 0,
        campaigns INT DEFAULT 0
      );

      CREATE TABLE leads (
        id VARCHAR(100) PRIMARY KEY,
        leadgen_id VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(255),
        city VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new',
        source VARCHAR(50),
        client_id VARCHAR(50) REFERENCES clients(id),
        campaign VARCHAR(255),
        ad_id VARCHAR(100),
        assigned_to VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        sla_breached BOOLEAN DEFAULT FALSE,
        field_data JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE activities (
        id SERIAL PRIMARY KEY,
        lead_id VARCHAR(100) REFERENCES leads(id) ON DELETE CASCADE,
        type VARCHAR(50),
        text TEXT,
        user_name VARCHAR(100),
        ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tables created.");

    // Insert clients
    for (const c of clients) {
      await pool.query(`
        INSERT INTO clients (id, name, industry, city, color, icon, account_id, forms, token_days, status, leads_today, cpl, conv_rate, total_leads, campaigns)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [c.id, c.name, c.industry, c.city, c.color, c.icon, c.accountId, c.forms, c.tokenDays, c.status, c.leadsToday, c.cpl, c.convRate, c.totalLeads, c.campaigns]);
    }
    console.log("✅ Clients inserted.");

    // Insert leads
    const leads = generateLeads(50);
    for (const l of leads) {
      await pool.query(`
        INSERT INTO leads (id, leadgen_id, name, first_name, last_name, phone, email, city, status, source, client_id, campaign, ad_id, created_at, sla_breached)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [l.id, l.leadgen_id, l.name, l.first_name, l.last_name, l.phone, l.email, l.city, l.status, l.source, l.client_id, l.campaign, l.ad_id, l.created_at, l.sla_breached]);
    }
    console.log("✅ 50 Mock Leads inserted.");

    console.log("🎉 Database initialization complete!");
  } catch (error) {
    console.error("Error initializing DB:", error);
  } finally {
    pool.end();
  }
}

initDB();
