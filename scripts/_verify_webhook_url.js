// Test the webhook GET verification endpoint (what Meta calls to verify the webhook URL)
const https = require('https');

const VERIFY_TOKEN = 'fwl-crm_secure_token_2026';
const challenge = 'test_challenge_12345';

// Test on fwl-crm.vercel.app
const url = `https://fwl-crm.vercel.app/api/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}`;

https.get(url, res => {
  let d = '';
  res.on('data', x => d += x);
  res.on('end', () => {
    console.log('=== WEBHOOK VERIFICATION TEST (fwl-crm.vercel.app) ===');
    console.log('Status:', res.statusCode);
    console.log('Response:', d);
    if (res.statusCode === 200 && d === challenge) {
      console.log('✅ Webhook verification PASSES — URL is valid for Meta');
    } else {
      console.log('❌ Webhook verification FAILED');
    }
  });
}).on('error', e => console.error('Error:', e.message));

// Also test on custom domain
setTimeout(() => {
  const url2 = `https://crm.futurewavelabs.in/api/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}`;
  https.get(url2, res => {
    let d = '';
    res.on('data', x => d += x);
    res.on('end', () => {
      console.log('\n=== WEBHOOK VERIFICATION TEST (crm.futurewavelabs.in) ===');
      console.log('Status:', res.statusCode);
      console.log('Response:', d);
    });
  }).on('error', e => console.log('\n=== crm.futurewavelabs.in ===\nError:', e.message));
}, 1000);
