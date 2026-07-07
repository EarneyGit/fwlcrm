const db = require('./_db');
const crypto = require('crypto');

const APP_SECRET         = process.env.META_APP_SECRET         || '';
const VERIFY_TOKEN       = process.env.WEBHOOK_VERIFY_TOKEN    || 'fwl-crm_secure_token_2026';
const PAGE_ACCESS_TOKEN  = process.env.META_PAGE_ACCESS_TOKEN  || '';

// Disable Next.js body parser so we can read raw bytes for HMAC verification
export const config = {
  api: { bodyParser: false },
};

// Read the full raw body from the request stream
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// --- Signature verification ---------------------------------
function verifySignature(rawBodyBuffer, signatureHeader) {
  if (!APP_SECRET) return true; // skip in dev if secret not configured
  if (!signatureHeader) return false;

  const [algo, digest] = signatureHeader.split('=');
  if (algo !== 'sha256') return false;

  const expected = crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBodyBuffer)
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

// --- Look up the page-specific access token stored by /api/oauth ---
async function getPageToken(pageId) {
  try {
    const { rows } = await db.query(
      'SELECT page_token FROM clients WHERE account_id = $1 AND page_token IS NOT NULL LIMIT 1',
      [String(pageId)]
    );
    if (rows.length && rows[0].page_token) return rows[0].page_token;
  } catch (_) {}
  return PAGE_ACCESS_TOKEN; // fallback: env token (Earney page)
}

// --- Fetch real lead details from Meta Graph API -------------
async function fetchLeadFromMeta(leadgenId, pageId) {
  const token = await getPageToken(pageId);
  if (!token) {
    console.warn('No page token available - lead data will be incomplete');
    return null;
  }

  const fields = 'field_data,created_time,ad_id,campaign_id,form_id,page_id';
  const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=${fields}&access_token=${token}`;

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
    // First try matching by page_id field
    const byPage = await db.query(
      "SELECT id FROM clients WHERE account_id = $1 OR account_id = $2 LIMIT 1",
      [String(pageId), 'page_' + String(pageId)]
    );
    if (byPage.rows.length) return byPage.rows[0].id;

    // Fallback: return the first available client
    const first = await db.query('SELECT id FROM clients ORDER BY name ASC LIMIT 1');
    if (first.rows.length) return first.rows[0].id;
  } catch (_) {}
  return null;
}

export default async function handler(req, res) {
  // -- Webhook Verification (GET from Meta) --------------------
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  // -- Webhook Payload (POST from Meta) ------------------------
  if (req.method === 'POST') {
    // Read raw body bytes for HMAC verification (bodyParser is disabled)
    const rawBodyBuffer = await getRawBody(req);
    const sigHeader     = req.headers['x-hub-signature-256'];

    if (!verifySignature(rawBodyBuffer, sigHeader)) {
      console.warn('Webhook signature mismatch - request rejected');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    let body;
    try {
      body = JSON.parse(rawBodyBuffer.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    if (body.object !== 'page') {
      return res.status(404).end();
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;

        const leadData  = change.value;
        const leadgenId = String(leadData.leadgen_id);
        const pageId    = String(leadData.page_id   || entry.id || '');
        const adId      = String(leadData.ad_id     || '');
        const campaign  = String(leadData.form_name || leadData.campaign_name || 'Meta Ads');

        try {
          // Fetch real contact details via Graph API (per-page token)
          const graphLead = await fetchLeadFromMeta(leadgenId, pageId);

          let firstName, lastName, phone, email, city, fieldData;

          if (graphLead?.field_data) {
            ({ firstName, lastName, phone, email, city, fieldData } = parseLeadFields(graphLead.field_data));
          } else {
            // Fallback: store what we have, fill details later
            firstName = 'Unknown';
            lastName  = 'Lead';
            phone     = '';
            email     = '';
            city      = '';
            fieldData = {};
          }

          const name     = `${firstName} ${lastName}`.trim();
          const clientId = await resolveClientId(pageId);
          const id       = `l_wh_${leadgenId}`;

          await db.query(`
            INSERT INTO leads (
              id, leadgen_id, name, first_name, last_name,
              phone, email, city, status, source,
              client_id, campaign, ad_id, field_data
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new','facebook',$9,$10,$11,$12)
            ON CONFLICT (leadgen_id) DO NOTHING
          `, [
            id, leadgenId, name, firstName, lastName,
            phone, email, city,
            clientId, campaign, adId,
            JSON.stringify(fieldData),
          ]);

          console.log(`Lead ingested: ${leadgenId} - ${name}`);
        } catch (err) {
          console.error(`Failed to process lead ${leadgenId}:`, err);
        }
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
