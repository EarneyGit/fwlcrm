// ============================================================
// FWL CRM - WhatsApp Cloud API webhook
// GET  = Meta verification handshake
// POST = messages + statuses ingestion (signature-verified)
// Register in Meta App > WhatsApp > Configuration:
//   https://fwl-crm.vercel.app/api/whatsapp-webhook
// Subscribe to the "messages" field.
// ============================================================
const db = require('./_db');
const crypto = require('crypto');
const wa = require('./_whatsapp');

// Raw body needed for HMAC verification (same pattern as api/webhook.js)
export const config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return true;                    // dev fallback
  if (!signatureHeader) return false;
  const [algo, digest] = signatureHeader.split('=');
  if (algo !== 'sha256') return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}

// --- Conversation upsert on inbound --------------------------
async function upsertConversation({ phoneNumberId, waId, profileName, referral, msgTs }) {
  const convId = 'conv_' + phoneNumberId + '_' + waId;
  const windowExpiry = new Date(msgTs.getTime() + 24 * 60 * 60 * 1000);

  const { rows } = await db.query(`
    INSERT INTO whatsapp_conversations
      (id, wa_id, phone_number_id, profile_name, status, unread_count,
       last_message_at, last_inbound_at, first_inbound_at,
       service_window_expires_at, source, referral)
    VALUES ($1,$2,$3,$4,'open',1,$5,$5,$5,$6,$7,$8)
    ON CONFLICT (phone_number_id, wa_id) DO UPDATE SET
      profile_name              = COALESCE(EXCLUDED.profile_name, whatsapp_conversations.profile_name),
      status                    = 'open',
      unread_count              = whatsapp_conversations.unread_count + 1,
      last_message_at           = EXCLUDED.last_message_at,
      last_inbound_at           = EXCLUDED.last_inbound_at,
      service_window_expires_at = EXCLUDED.service_window_expires_at,
      referral = CASE WHEN EXCLUDED.referral != '{}'::jsonb
                      THEN EXCLUDED.referral
                      ELSE whatsapp_conversations.referral END
    RETURNING *
  `, [
    convId, waId, phoneNumberId, profileName || null, msgTs, windowExpiry,
    referral ? 'ctwa' : 'organic',
    JSON.stringify(referral || {}),
  ]);
  return rows[0];
}

// Extract a text preview for any message type
function messageBody(msg) {
  switch (msg.type) {
    case 'text':        return msg.text?.body || '';
    case 'button':      return msg.button?.text || '';
    case 'interactive': return msg.interactive?.button_reply?.title
                            || msg.interactive?.list_reply?.title || '';
    case 'image':       return msg.image?.caption || '[image]';
    case 'video':       return msg.video?.caption || '[video]';
    case 'audio':       return '[audio]';
    case 'document':    return msg.document?.filename || '[document]';
    case 'sticker':     return '[sticker]';
    case 'location':    return '[location]';
    case 'contacts':    return '[contact card]';
    case 'reaction':    return msg.reaction?.emoji || '[reaction]';
    default:            return '[' + (msg.type || 'unknown') + ']';
  }
}

function mediaId(msg) {
  const m = msg.image || msg.video || msg.audio || msg.document || msg.sticker;
  return (m && m.id) || null;
}

// --- Inbound message processing -------------------------------
async function processInboundMessage(value, msg) {
  const phoneNumberId = String(value.metadata?.phone_number_id || '');
  const waId = String(msg.from || '');
  const contact = (value.contacts || []).find(c => c.wa_id === waId);
  const profileName = contact?.profile?.name || null;
  const msgTs = msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date();
  const referral = msg.referral || null;

  const conv = await upsertConversation({ phoneNumberId, waId, profileName, referral, msgTs });

  // Insert message (idempotent on wamid)
  const inserted = await db.query(`
    INSERT INTO whatsapp_messages
      (id, conversation_id, direction, msg_type, body, media_id, status, payload, ts)
    VALUES ($1,$2,'in',$3,$4,$5,'received',$6,$7)
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `, [
    String(msg.id), conv.id, msg.type || 'unknown', messageBody(msg),
    mediaId(msg), JSON.stringify(msg), msgTs,
  ]);
  if (!inserted.rows.length) return { duplicate: true };   // replayed webhook

  // Link (or create) the CRM lead
  if (!conv.lead_id) {
    const clientId = await wa.getAccountClientId(phoneNumberId);
    const { lead, created } = await wa.findOrCreateLead({
      waId, profileName, clientId, referral,
    });
    if (lead) {
      await db.query(
        'UPDATE whatsapp_conversations SET lead_id = $1, client_id = COALESCE(client_id, $2) WHERE id = $3',
        [lead.id, clientId, conv.id]
      );
      await wa.logActivity(
        lead.id, 'whatsapp',
        created
          ? 'New lead created from inbound WhatsApp message'
          : 'Inbound WhatsApp message: "' + messageBody(msg).slice(0, 120) + '"'
      );
      console.log('WA message ' + msg.id + ' -> lead ' + lead.id + (created ? ' (created)' : ''));
    }
  } else {
    await wa.logActivity(
      conv.lead_id, 'whatsapp',
      'Inbound WhatsApp message: "' + messageBody(msg).slice(0, 120) + '"'
    );
  }
  if (!conv.assigned_to) {
    const assignee = await wa.applyAssignment(conv.id, phoneNumberId);
    if (assignee && conv.lead_id) {
      await wa.logActivity(conv.lead_id, 'assignment', 'Auto-assigned WhatsApp conversation to ' + assignee);
    }
  }

  return { duplicate: false };
}

// --- Outbound status updates (sent/delivered/read/failed) -----
async function processStatus(value, st) {
  const errText = (st.errors && st.errors[0])
    ? (st.errors[0].title || '') + ' ' + (st.errors[0].message || '')
    : null;
  await db.query(`
    UPDATE whatsapp_messages
    SET status = $1, error_text = COALESCE($2, error_text)
    WHERE id = $3
  `, [st.status, errText, String(st.id)]);
}

export default async function handler(req, res) {
  const cfg = wa.getWaConfig();

  // -- Verification handshake ---------------------------------
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === cfg.verifyToken) {
      console.log('WhatsApp webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  // -- Event payload -------------------------------------------
  if (req.method === 'POST') {
    const rawBody = await getRawBody(req);
    const sig = req.headers['x-hub-signature-256'];

    if (!verifySignature(rawBody, sig, cfg.appSecret)) {
      console.warn('WhatsApp webhook signature mismatch - rejected');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    let body;
    try { body = JSON.parse(rawBody.toString('utf8')); }
    catch { return res.status(400).json({ error: 'Invalid JSON' }); }

    if (body.object !== 'whatsapp_business_account') {
      return res.status(404).end();
    }

    await wa.ensureWhatsappSchema();

    let processed = 0, failed = 0;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const value = change.value || {};

        for (const msg of value.messages || []) {
          try {
            await processInboundMessage(value, msg);
            processed++;
          } catch (err) {
            failed++;
            console.error('WA inbound failed ' + msg.id + ':', err);
            await wa.logWebhookEvent('whatsapp', 'message_error', msg, false, err.message);
          }
        }

        for (const st of value.statuses || []) {
          try {
            await processStatus(value, st);
            processed++;
          } catch (err) {
            failed++;
            console.error('WA status failed ' + st.id + ':', err);
            await wa.logWebhookEvent('whatsapp', 'status_error', st, false, err.message);
          }
        }
      }
    }

    // Audit trail (raw payload) - kept lightweight, single row per POST
    await wa.logWebhookEvent(
      'whatsapp',
      failed ? 'batch_partial' : 'batch_ok',
      body, failed === 0,
      failed ? (failed + ' item(s) failed') : null
    );

    // Always 200 so Meta does not retry-storm; failures are logged
    return res.status(200).send('EVENT_RECEIVED');
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method ' + req.method + ' Not Allowed');
}
