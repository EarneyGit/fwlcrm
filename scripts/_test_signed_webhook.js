// Send a properly HMAC-signed test webhook to confirm the endpoint processes it
require('dotenv').config();
const https = require('https');
const crypto = require('crypto');

const APP_SECRET = process.env.META_APP_SECRET;
const PAGE_TOKEN = 'EAAjBqYlKt0cBRzSVee4ICpcAXhd0Q58EqiE85RlW1R2eMUjKbysEfcQTH1BJotoNXFuC7CdT7EvyM1KfdQKIGtmp1olVzFFx40th0J5NkzvxLmt1x5khmh5Flf3Bj9zrJC5doT6FY8hKGt7pOBMEOJIQRDWLq7teN1eKf0x0IYbQ0iLqdKHbiIzMUkXVv5CxI2HgheXyGCqnAhg4U28ZD';

console.log('APP_SECRET loaded:', APP_SECRET ? APP_SECRET.substring(0,8) + '...' : 'MISSING');

const payload = JSON.stringify({
  object: 'page',
  entry: [{
    id: '101448221738798',
    time: Math.floor(Date.now() / 1000),
    changes: [{
      field: 'leadgen',
      value: {
        leadgen_id: 'SIGNED_TEST_' + Date.now(),
        page_id: '101448221738798',
        form_id: 'test_form_signed',
        ad_id: 'test_ad',
        created_time: Math.floor(Date.now() / 1000),
        form_name: 'E Com website 4999 - 09.11.2023'
      }
    }]
  }]
});

const signature = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(payload).digest('hex');
console.log('Generated signature:', signature.substring(0, 30) + '...');

const options = {
  hostname: 'fwl-crm.vercel.app',
  path: '/api/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'X-Hub-Signature-256': signature
  }
};

console.log('\nSending signed POST to /api/webhook...');
const req = https.request(options, res => {
  let d = '';
  res.on('data', x => d += x);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', d);
    if (res.statusCode === 200) {
      console.log('\n✅ Signed webhook ACCEPTED — signature verification works!');
      console.log('The lead "SIGNED_TEST_..." should now be in the DB (with blank name since its a fake leadgen_id)');
    } else if (res.statusCode === 403) {
      console.log('\n❌ Still 403 — APP_SECRET in Vercel does NOT match the actual app secret');
      console.log('Local APP_SECRET:', APP_SECRET);
      console.log('You need to get the REAL app secret from Meta App Dashboard and update Vercel env');
    }
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(payload);
req.end();
