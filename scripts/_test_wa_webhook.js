// ============================================================
// FWL CRM - WhatsApp webhook simulator (Batch 7 test tooling)
// Sends a signed fake inbound message to the deployed webhook.
// Run: node scripts/_test_wa_webhook.js [phone] [text]
// Requires META_APP_SECRET (or WA_APP_SECRET) in .env
// ============================================================
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');

const URL_HOST = 'fwl-crm.vercel.app';
const URL_PATH = '/api/whatsapp-webhook';
const SECRET = process.env.WA_APP_SECRET || process.env.META_APP_SECRET || '';

const phone = process.argv[2] || '919876543210';
const text  = process.argv[3] || 'Hello, I saw your ad and want a quote';
const now = Math.floor(Date.now() / 1000);

const payload = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{
    id: 'TEST_WABA',
    changes: [{
      field: 'messages',
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '9199999', phone_number_id: 'TEST_PHONE_ID' },
        contacts: [{ profile: { name: 'Test Customer' }, wa_id: phone }],
        messages: [{
          from: phone,
          id: 'wamid.TEST_' + now,
          timestamp: String(now),
          type: 'text',
          text: { body: text },
        }],
      },
    }],
  }],
});

const sig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

const req = https.request({
  hostname: URL_HOST, path: URL_PATH, method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'X-Hub-Signature-256': sig,
  },
}, res => {
  let d = '';
  res.on('data', x => d += x);
  res.on('end', () => {
    console.log('HTTP', res.statusCode, d);
    console.log(res.statusCode === 200
      ? 'OK - check the WhatsApp inbox for a conversation from ' + phone
      : 'FAILED - check signature secret and deployment');
  });
});
req.on('error', e => console.error('Request failed:', e.message));
req.write(payload);
req.end();
