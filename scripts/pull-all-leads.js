// Pull ALL leads from ALL Earney forms and insert into CRM database
require('dotenv').config();
const https = require('https');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const PAGE_TOKEN = 'EAAjBqYlKt0cBRxLl8xaEAENuxCrZBeWgKl4oJDUR5X0JzPq2T1PFqthlDZBAp5TInJ79jUQPve1s4gxPcaoleGPZBWKmV1v7GiNS1DqW1cVU1SbZBZCdRXDlx5BRkKjOiWfBTb8Ln0EQSI8JVmR3xZAH2VMc4wGFJ7cxN0SZASlZA6CcPrM4ZAZAxpZCcqBfTY5tLmncx3bGssGO2CKLZBTPre8ZD';
const PAGE_ID    = '101448221738798';

function get(url) {
  return new Promise((res, rej) => {
    const full = url + (url.includes('?') ? '&' : '?') + 'access_token=' + PAGE_TOKEN;
    https.get(full, r => { let d=''; r.on('data',x=>d+=x); r.on('end',()=>{ try{res(JSON.parse(d))}catch{res(d)} }); }).on('error', rej);
  });
}

function parseLead(fieldDataArr) {
  const m = {};
  for (const { name, values } of (fieldDataArr || [])) m[name] = values?.[0] || '';
  const full = m['full_name'] || '';
  const parts = full.split(' ');
  return {
    firstName: m['first_name'] || parts[0] || 'Meta',
    lastName:  m['last_name']  || parts.slice(1).join(' ') || 'Lead',
    phone:     m['phone_number'] || m['phone'] || '',
    email:     m['email'] || '',
    city:      m['city'] || m['location'] || '',
    fieldData: m,
    fullName:  full,
  };
}

async function insertLead(lead, formName) {
  const { firstName, lastName, phone, email, city, fieldData, fullName } = parseLead(lead.field_data);
  const name = fullName || `${firstName} ${lastName}`.trim();
  const id   = `l_wh_${lead.id}`;

  const { rowCount } = await pool.query(`
    INSERT INTO leads
      (id, leadgen_id, name, first_name, last_name, phone, email, city,
       status, source, client_id, campaign, ad_id, field_data)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new','facebook','earney',$9,'',$10)
    ON CONFLICT (leadgen_id) DO UPDATE SET
      name=EXCLUDED.name, phone=EXCLUDED.phone, email=EXCLUDED.email
    RETURNING id
  `, [id, lead.id, name, firstName, lastName, phone, email, city,
      formName, JSON.stringify(fieldData)]);

  return rowCount > 0;
}

async function getAllForms() {
  let forms = [];
  let url = `https://graph.facebook.com/v20.0/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count&limit=50`;
  while (url) {
    const data = await get(url);
    if (data.error) { console.error('Forms error:', data.error.message); break; }
    forms = forms.concat(data.data || []);
    url = data.paging?.next || null;
  }
  return forms;
}

async function main() {
  console.log('🔗 Fetching all lead forms from Earney page...\n');
  const forms = await getAllForms();
  console.log(`Found ${forms.length} forms total`);

  let totalInserted = 0;
  let totalSkipped  = 0;

  for (const form of forms) {
    if (form.leads_count === 0) continue;

    console.log(`\n📋 Form: "${form.name}" (${form.leads_count} leads)`);
    const leadsData = await get(`https://graph.facebook.com/v20.0/${form.id}/leads?fields=id,field_data,created_time&limit=100`);

    if (leadsData.error) {
      console.log(`   ❌ Error: ${leadsData.error.message}`);
      continue;
    }

    for (const lead of (leadsData.data || [])) {
      const inserted = await insertLead(lead, form.name);
      if (inserted) {
        const { fieldData } = parseLead(lead.field_data);
        const name = fieldData['full_name'] || fieldData['first_name'] || 'Unknown';
        const phone = fieldData['phone_number'] || fieldData['phone'] || 'no phone';
        console.log(`   ✅ Inserted: ${name} | ${phone}`);
        totalInserted++;
      } else {
        totalSkipped++;
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Inserted: ${totalInserted} leads`);
  console.log(`⏭️  Skipped (already existed): ${totalSkipped} leads`);
  console.log(`\n🎉 Done! Open https://fwl-crm.vercel.app/#leads to see your leads`);
  await pool.end();
}

main().catch(e => { console.error('ERR:', e.message); pool.end(); });
