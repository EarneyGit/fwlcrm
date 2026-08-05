const https = require('https');
const { requireEnv } = require('./_script_env');
const PAGE_TOKEN = requireEnv('META_PAGE_ACCESS_TOKEN');
const PAGE_ID = requireEnv('META_PAGE_ID');

function get(path) {
  return new Promise((res, rej) => {
    https.get('https://graph.facebook.com/v20.0' + path + '&access_token=' + PAGE_TOKEN, r => {
      let d = ''; r.on('data', x => d += x); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

function post(path, body) {
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'graph.facebook.com',
      path: '/v20.0' + path + '?access_token=' + PAGE_TOKEN,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, r => { let d = ''; r.on('data', x => d += x); r.on('end', () => res(JSON.parse(d))); });
    req.on('error', rej);
    req.write(data); req.end();
  });
}

async function main() {
  console.log('=== CURRENT SUBSCRIPTIONS ===');
  const current = await get('/' + PAGE_ID + '/subscribed_apps?');
  console.log(JSON.stringify(current, null, 2));

  console.log('\n=== SUBSCRIBING TO LEADGEN ===');
  const result = await post('/' + PAGE_ID + '/subscribed_apps', {
    subscribed_fields: ['leadgen']
  });
  console.log(JSON.stringify(result, null, 2));

  console.log('\n=== TOKEN DEBUG ===');
  const debug = await get('/debug_token?input_token=' + PAGE_TOKEN + '&');
  console.log(JSON.stringify(debug?.data || debug, null, 2));
}
main().catch(e => console.error('ERR:', e.message));
