// Simulate a Meta leadgen webhook POST to test our endpoint
// This bypasses HMAC so we can confirm the processing logic works

require('dotenv').config();
const https = require('https');

// Simulate the webhook payload Meta sends
const payload = JSON.stringify({
  object: 'page',
  entry: [{
    id: '101448221738798',
    time: Math.floor(Date.now() / 1000),
    changes: [{
      field: 'leadgen',
      value: {
        leadgen_id: 'TEST_' + Date.now(),
        page_id: '101448221738798',
        form_id: 'test_form',
        ad_id: 'test_ad',
        created_time: Math.floor(Date.now() / 1000),
        form_name: 'E Com website 4999 - 09.11.2023'
      }
    }]
  }]
});

const options = {
  hostname: 'fwl-crm.vercel.app',
  path: '/api/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    // No signature — tests if APP_SECRET is blocking it
  }
};

const req = https.request(options, res => {
  let d = '';
  res.on('data', x => d += x);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', d);
    if (res.statusCode === 403) {
      console.log('\n⚠️  403 = HMAC signature verification is BLOCKING the webhook!');
      console.log('Fix: The META_APP_SECRET in Vercel does not match the actual app secret, OR');
      console.log('the webhook code rejects requests without a signature.');
    } else if (res.statusCode === 200) {
      console.log('\n✅ Webhook accepted the request — check DB for the lead');
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(payload);
req.end();
