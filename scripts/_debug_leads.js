require('dotenv').config();
const https = require('https');
const { createPgPool, requireEnv } = require('./_script_env');

const pool = createPgPool();
const PAGE_TOKEN = requireEnv('META_PAGE_ACCESS_TOKEN');
const PAGE_ID = requireEnv('META_PAGE_ID');

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => { let d=''; r.on('data',x=>d+=x); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
}

async function main() {
  // 1. Check DB for any leads
  console.log('=== DB LEADS ===');
  const { rows } = await pool.query('SELECT id, leadgen_id, name, created_at FROM leads ORDER BY created_at DESC LIMIT 10');
  console.log(rows.length === 0 ? 'NO LEADS IN DB' : JSON.stringify(rows, null, 2));

  // 2. Fetch recent leadgen forms and their leads from Meta directly
  console.log('\n=== META LEAD FORMS ===');
  const forms = await get(`https://graph.facebook.com/v20.0/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count,created_time&access_token=${PAGE_TOKEN}`);
  console.log(JSON.stringify(forms, null, 2));

  // 3. If forms exist, fetch leads from first form
  if (forms.data && forms.data.length > 0) {
    console.log('\n=== LEADS FROM FIRST FORM ===');
    const formId = forms.data[0].id;
    const leads = await get(`https://graph.facebook.com/v20.0/${formId}/leads?fields=id,field_data,created_time&access_token=${PAGE_TOKEN}`);
    console.log(JSON.stringify(leads, null, 2));
  }

  await pool.end();
}
main().catch(e => { console.error('ERR:', e.message); pool.end(); });
