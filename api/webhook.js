const db = require('./_db');
const crypto = require('crypto');

const APP_SECRET         = process.env.META_APP_SECRET         || '';
const VERIFY_TOKEN       = process.env.WEBHOOK_VERIFY_TOKEN    || 'fwl-crm_secure_token_2026';
const PAGE_ACCESS_TOKEN  = process.env.META_PAGE_ACCESS_TOKEN  || '';

// ─── Signature verification ───────────────────────────────
function verifySignature(rawBody, signatureHeader) {
  if (!APP_SECRET) return true; // skip in dev if secret not configured
  if (!signatureHeader) return false;

  const [algo, digest] = signatureHeader.split('=');
  if (algo !== 'sha256') return false;

  const expected = crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest,   'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

// ─── Fetch real lead details from Meta Graph API ──────────
async function fetchLeadFromMeta(leadgenId) {
  if (!PAGE_ACCESS_TOKEN) {
    console.warn('META_PAGE_ACCESS_TOKEN not set — lead data will be incomplete');
    return null;
  }

  const fields = 'field_data,created_time,ad_id,campaign_id,form_id,page_id';
  const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=${fields}&access_token=${PAGE_ACCESS_TOKEN}`;

  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.text();
    console.error('Meta Graph API error:', err);
    return null;
  }
  return response.json();
}

// Convert Graph API field_data array to contact fields + raw map
function parseLeadFields(fieldDataArr) {
  const map = {};
  for (const { name, values } of (fieldDataArr || [])) {
    map[name] = values?.[0] || '';
  }

  const fullName = map['full_name'] || '';
  const parts    = fullName.split(' ');

  return {
    firstName: map['first_name'] || parts[0] || 'Meta',
    lastName:  map['last_name']  || parts.slice(1).join(' ') || 'Lead',
    phone:     map['phone_number'] || map['phone'] || '',
    email:     map['email'] || '',
    city:      map['city']  || map['location'] || '',
    fieldData: map,
  };
}

// Match Meta page_id to a client row in the DB
async function resolveClientId(pageId) {
  try {
    const { rows } = await db.query(
      'SELECT id FROM clients WHERE account_id = $1 LIMIT 1',
      [String(pageId)]
    );
    if (rows.length) return rows[0].id;
  } catch (_) {}
  return 'c1'; // fallback to first client
}

export default async function handler(req, res) {
  // ── Webhook Verification (GET from Meta) ─────────────────
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({