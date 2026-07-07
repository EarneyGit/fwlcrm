const https = require('https');
const PAGE_TOKEN = 'EAAjBqYlKt0cBRzSVee4ICpcAXhd0Q58EqiE85RlW1R2eMUjKbysEfcQTH1BJotoNXFuC7CdT7EvyM1KfdQKIGtmp1olVzFFx40th0J5NkzvxLmt1x5khmh5Flf3Bj9zrJC5doT6FY8hKGt7pOBMEOJIQRDWLq7teN1eKf0x0IYbQ0iLqdKHbiIzMUkXVv5CxI2HgheXyGCqnAhg4U28ZD';
const PAGE_ID = '101448221738798';

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
