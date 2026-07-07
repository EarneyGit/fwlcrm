// Manually fetch leads from all forms on the Earney page and insert into DB
require('dotenv').config();
const https = require('https');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const PAGE_TOKEN = 'EAAjBqYlKt0cBRzSVee4ICpcAXhd0Q58EqiE85RlW1R2eMUjKbysEfcQTH1BJotoNXFuC7CdT7EvyM1KfdQKIGtmp1olVzFFx40th0J5NkzvxLmt1x5khmh5Flf3Bj9zrJC5doT6FY8hKGt7pOBMEOJIQRDWLq7teN1eKf0x0IYbQ0iLqdKHbiIzMUkXVv5CxI2HgheXyGCqnAhg4U28ZD';
const PAGE_ID = '101448221738798';

function get(url) {
  return new Promise((res, rej) => {
    https.get(url + (url.includes('?') ? '&' : '?') + 'access_token=' + PAGE_TOKEN, r => {
      let d = ''; r.on('data', x => d += x);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

async function insertLead(lead, formName, clientId) {
  const fields = {};
  for (const { name, values } of (lead.field_data || [])) {
    fields[name] = values?.[0] || '';
  }

  const fullName = fields['full_name'] || '';
  const parts = fullName.split(' ');
  const firstName = fields['first_name'] || parts[0] || 'Meta';
  const lastName  = fields['last_name']  || parts.slice(1).join(' ') || 'Lead';
  const phone     = fields['phone_number'] || fields['phone'] || '';
  const email     = fields['email'] || '';
  const city      = fields['city'] || '';
  const name      = fullName || `${firstName} ${lastName}`.trim();
  const id        = `l_wh_${lead.id}`;

  try {
    const { rowCount } = await pool.query(`
      INSERT INTO leads (id, leadgen_id, name, first_name, last_name, phone, email, city, status, source, client_id, campaign, field_data)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new','facebook',$9,$10,$11)
      ON CONFLICT (leadgen_id) DO NOTHING
    `, [id, lead.id, name, firstName, lastName, phone, email, city, clientId, formName, JSON.stringify(fields)]);

    if (rowCount > 0) {
      console.log(`✅ Inserted lead: ${name} (${lead.id})`);
    } else {
      console.log(`⏭️  Already exists: ${lead.id}`);
    }
  } catch (err) {
    console.error(`❌ Failed to insert ${lead.id}:`, err.message);
  }
}

async function main() {
  console.log('Fetching lead forms from Earney page...');

  // Try fetching forms directly with leads_retrieval permission
  const formsUrl = `https://graph.facebook.com/v20.0/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count`;
  const forms = await get(formsUrl);

  if (forms.error) {
    console.log('Forms API error:', forms.error.message);
    console.log('\nTrying to fetch leads from known form IDs...');

    // Try fetching from specific known form we saw in the testing tool
    // We'll search by trying to get recent leads for the page
    const pageLeads = await get(`https://graph.facebook.com/v20.0/${PAGE_ID}/leads?fields=id,field_data,created_time,form_id`);
    console.log('Page leads:', JSON.stringify(pageLeads, null, 2));
    await pool.end();
    return;
  }

  console.log(`Found ${forms.data?.length || 0} forms`);

  for (const form of (forms.data || [])) {
    console.log(`\nFetching leads from form: "${form.name}" (${form.id}) — ${form.leads_count} leads`);
    const leadsData = await get(`https://graph.facebook.com/v20.0/${form.id}/leads?fields=id,field_data,created_time`);

    if (leadsData.error) {
      console.log('  Error:', leadsData.error.message);
      continue;
    }

    for (const lead of (leadsData.data || [])) {
      await insertLead(lead, form.name, 'earney');
    }
  }

  console.log('\nDone!');
  await pool.end();
}
main().catch(e => { console.error('ERR:', e.message); pool.end(); });
