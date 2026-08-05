require('dotenv').config();
const { assertSafeDestructiveRun } = require('./_guard_destructive');
const { createPgPool } = require('./_script_env');

assertSafeDestructiveRun('scripts/init-db.js');

const pool = createPgPool();

const clients = [
  { id:'c1', name:'Prestige Builders', industry:'Real Estate', city:'Chennai', color:'#1877F2', icon:'🏠', accountId:'act_1234567890', googleCustomerId:null, googleAdsEnabled:false, googleConversionActionId:null, googleConversionActionName:null, forms:4, tokenDays:42, status:'connected', leadsToday:18, cpl:870, convRate:4.2, totalLeads:1240, campaigns:6 },
  { id:'c2', name:'Velammal Schools', industry:'Education', city:'Chennai', color:'#6C47FF', icon:'🎓', accountId:'act_9876543210', googleCustomerId:null, googleAdsEnabled:false, googleConversionActionId:null, googleConversionActionName:null, forms:3, tokenDays:8, status:'warning', leadsToday:34, cpl:310, convRate:6.8, totalLeads:2890, campaigns:4 },
  { id:'c3', name:'Sri Balaji Hospitals', industry:'Healthcare', city:'Coimbatore', color:'#10B981', icon:'🏥', accountId:'act_1122334455', googleCustomerId:null, googleAdsEnabled:false, googleConversionActionId:null, googleConversionActionName:null, forms:2, tokenDays:55, status:'connected', leadsToday:12, cpl:580, convRate:9.1, totalLeads:890, campaigns:3 },
  { id:'c4', name:'NxtGen Academy', industry:'EdTech', city:'Madurai', color:'#F59E0B', icon:'💻', accountId:'act_5566778899', googleCustomerId:null, googleAdsEnabled:false, googleConversionActionId:null, googleConversionActionName:null, forms:5, tokenDays:0, status:'error', leadsToday:0, cpl:420, convRate:3.5, totalLeads:560, campaigns:7 },
  { id:'c5', name:'Kotak Mahindra Finance', industry:'BFSI', city:'Chennai', color:'#EF4444', icon:'🏦', accountId:'act_6677889900', googleCustomerId:null, googleAdsEnabled:false, googleConversionActionId:null, googleConversionActionName:null, forms:3, tokenDays:29, status:'connected', leadsToday:22, cpl:1200, convRate:2.1, totalLeads:3100, campaigns:5 },
];

const agents = [
  { id:'a1', name:'Arjun Rajan',    initials:'AR', color:'#1877F2', role:'Senior BDA',   email:'arjun@fwlagency.com',    status:'active' },
  { id:'a2', name:'Meena Suresh',   initials:'MS', color:'#6C47FF', role:'BDA',           email:'meena@fwlagency.com',    status:'active' },
  { id:'a3', name:'Kiran Pillai',   initials:'KP', color:'#10B981', role:'BDA',           email:'kiran@fwlagency.com',    status:'active' },
  { id:'a4', name:'Divya Natarajan',initials:'DN', color:'#F59E0B', role:'Team Lead',     email:'divya@fwlagency.com',    status:'active' },
  { id:'a5', name:'Senthil Kumar',  initials:'SK', color:'#EF4444', role:'BDA',           email:'senthil@fwlagency.com',  status:'active' },
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
const sourcePlatforms = ['meta', 'meta', 'meta', 'manual', 'manual', 'google'];

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
      source_platform: sourcePlatforms[Math.floor(Math.random()*sourcePlatforms.length)],
      client_id: client.id,
      campaign: campaigns[Math.floor(Math.random()*campaigns.length)],
      ad_id: `ad_${Math.floor(Math.random()*10000)}`,
      gclid: null,
      gbraid: null,
      wbraid: null,
      google_campaign_id: null,
      google_campaign_name: null,
      google_ad_group_id: null,
      google_ad_group_name: null,
      google_ad_id: null,
      google_ad_name: null,
      google_click_at: null,
      google_conversion_uploaded_at: null,
      google_conversion_status: null,
      google_conversion_error: null,
      created_at: date.toISOString(),
      sla_breached: false
    });

    const lastLead = leads[leads.length - 1];
    if (lastLead && lastLead.source_platform === 'google') {
      lastLead.source = 'manual';
      lastLead.gclid = `test-gclid-${Date.now()}-${i}`;
      lastLead.google_campaign_id = `google-campaign-${Math.floor(Math.random()*10000)}`;
      lastLead.google_campaign_name = campaigns[Math.floor(Math.random()*campaigns.length)] + ' (Google)';
      lastLead.google_ad_group_id = `google-ad-group-${Math.floor(Math.random()*10000)}`;
      lastLead.google_ad_group_name = 'Search Ad Group';
      lastLead.google_ad_id = `google-ad-${Math.floor(Math.random()*10000)}`;
      lastLead.google_ad_name = 'Responsive Search Ad';
      lastLead.google_click_at = date.toISOString();
    }
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
      DROP TABLE IF EXISTS agents;

      CREATE TABLE agents (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        initials VARCHAR(10),
        color VARCHAR(20),
        role VARCHAR(100),
        email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active'
      );

      CREATE TABLE clients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        city VARCHAR(100),
        color VARCHAR(20),
        icon VARCHAR(20),
        account_id VARCHAR(100),
        google_customer_id TEXT,
        google_ads_enabled BOOLEAN DEFAULT FALSE,
        google_conversion_action_id TEXT,
        google_conversion_action_name TEXT,
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
        source_platform VARCHAR(50) DEFAULT 'manual',
        client_id VARCHAR(50) REFERENCES clients(id),
        campaign VARCHAR(255),
        ad_id VARCHAR(100),
        gclid TEXT,
        gbraid TEXT,
        wbraid TEXT,
        google_campaign_id TEXT,
        google_campaign_name TEXT,
        google_ad_group_id TEXT,
        google_ad_group_name TEXT,
        google_ad_id TEXT,
        google_ad_name TEXT,
        google_click_at TIMESTAMP WITH TIME ZONE,
        google_conversion_uploaded_at TIMESTAMP WITH TIME ZONE,
        google_conversion_status TEXT,
        google_conversion_error TEXT,
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
        INSERT INTO clients (id, name, industry, city, color, icon, account_id, google_customer_id, google_ads_enabled, google_conversion_action_id, google_conversion_action_name, forms, token_days, status, leads_today, cpl, conv_rate, total_leads, campaigns)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [c.id, c.name, c.industry, c.city, c.color, c.icon, c.accountId, c.googleCustomerId, c.googleAdsEnabled, c.googleConversionActionId, c.googleConversionActionName, c.forms, c.tokenDays, c.status, c.leadsToday, c.cpl, c.convRate, c.totalLeads, c.campaigns]);
    }
    console.log("✅ Clients inserted.");

    // Insert agents
    for (const a of agents) {
      await pool.query(`
        INSERT INTO agents (id, name, initials, color, role, email, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [a.id, a.name, a.initials, a.color, a.role, a.email, a.status]);
    }
    console.log("✅ Agents inserted.");

    // Insert leads
    const leads = generateLeads(50);
    for (const l of leads) {
      await pool.query(`
        INSERT INTO leads (
          id, leadgen_id, name, first_name, last_name, phone, email, city, status, source, source_platform, client_id,
          campaign, ad_id, gclid, gbraid, wbraid, google_campaign_id, google_campaign_name, google_ad_group_id,
          google_ad_group_name, google_ad_id, google_ad_name, google_click_at, google_conversion_uploaded_at,
          google_conversion_status, google_conversion_error, created_at, sla_breached
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25,
          $26, $27, $28, $29
        )
      `, [
        l.id, l.leadgen_id, l.name, l.first_name, l.last_name, l.phone, l.email, l.city, l.status, l.source, l.source_platform, l.client_id,
        l.campaign, l.ad_id, l.gclid, l.gbraid, l.wbraid, l.google_campaign_id, l.google_campaign_name, l.google_ad_group_id,
        l.google_ad_group_name, l.google_ad_id, l.google_ad_name, l.google_click_at, l.google_conversion_uploaded_at,
        l.google_conversion_status, l.google_conversion_error, l.created_at, l.sla_breached
      ]);
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
