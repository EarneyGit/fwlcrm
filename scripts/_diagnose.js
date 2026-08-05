const https = require('https');
const { requireEnv, maskSecret } = require('./_script_env');

const APP_ID     = requireEnv('META_APP_ID');
const APP_SECRET = requireEnv('META_APP_SECRET');
const PAGE_TOKEN = requireEnv('META_PAGE_ACCESS_TOKEN');
const APP_TOKEN  = APP_ID + '|' + APP_SECRET; // App Access Token
const PAGE_ID    = requireEnv('META_PAGE_ID');

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => { let d=''; r.on('data',x=>d+=x); r.on('end',()=>{ try{res(JSON.parse(d))}catch{res(d)} }); }).on('error', rej);
  });
}

async function main() {
  console.log('Using META_APP_ID:', maskSecret(APP_ID));
  console.log('Using META_PAGE_ID:', PAGE_ID);
  console.log('Using META_PAGE_ACCESS_TOKEN:', maskSecret(PAGE_TOKEN));

  // 1. Check app-level webhook subscriptions
  console.log('=== APP-LEVEL WEBHOOK SUBSCRIPTIONS ===');
  const subs = await get(`https://graph.facebook.com/v20.0/${APP_ID}/subscriptions?access_token=${APP_TOKEN}`);
  console.log(JSON.stringify(subs, null, 2));

  // 2. Check page-level subscriptions (what fields this page delivers)
  console.log('\n=== PAGE-LEVEL SUBSCRIPTIONS ===');
  const pageSubs = await get(`https://graph.facebook.com/v20.0/${PAGE_ID}/subscribed_apps?access_token=${PAGE_TOKEN}`);
  console.log(JSON.stringify(pageSubs, null, 2));

  // 3. Try fetching lead forms with new token (has pages_manage_ads now)
  console.log('\n=== LEAD FORMS (with new token) ===');
  const forms = await get(`https://graph.facebook.com/v20.0/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count,status&access_token=${PAGE_TOKEN}`);
  console.log(JSON.stringify(forms, null, 2));

  // 4. Token debug — confirm new scopes
  console.log('\n=== TOKEN SCOPES ===');
  const debug = await get(`https://graph.facebook.com/v20.0/debug_token?input_token=${PAGE_TOKEN}&access_token=${APP_TOKEN}`);
  console.log(JSON.stringify(debug?.data?.scopes || debug, null, 2));
}
main().catch(e => console.error('ERR:', e.message));
