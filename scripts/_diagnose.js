const https = require('https');

const APP_ID     = '2464733710694215';
const APP_SECRET = '9ce03784c7c38f5335a3c7af2bf0aa93';
const PAGE_TOKEN = 'EAAjBqYlKt0cBRxLl8xaEAENuxCrZBeWgKl4oJDUR5X0JzPq2T1PFqthlDZBAp5TInJ79jUQPve1s4gxPcaoleGPZBWKmV1v7GiNS1DqW1cVU1SbZBZCdRXDlx5BRkKjOiWfBTb8Ln0EQSI8JVmR3xZAH2VMc4wGFJ7cxN0SZASlZA6CcPrM4ZAZAxpZCcqBfTY5tLmncx3bGssGO2CKLZBTPre8ZD';
const APP_TOKEN  = APP_ID + '|' + APP_SECRET; // App Access Token
const PAGE_ID    = '101448221738798';

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => { let d=''; r.on('data',x=>d+=x); r.on('end',()=>{ try{res(JSON.parse(d))}catch{res(d)} }); }).on('error', rej);
  });
}

async function main() {
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
