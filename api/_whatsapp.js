// ============================================================
// FWL CRM - WhatsApp shared utilities (not routed: _ prefix)
// Schema management, phone normalization, lead matching,
// config access, and (future) write-endpoint auth.
// ============================================================
const db = require('./_db');

// --- Schema (additive, idempotent) --------------------------
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS whatsapp_accounts (
    id              VARCHAR(50) PRIMARY KEY,
    client_id       VARCHAR(50) REFERENCES clients(id),
    waba_id         VARCHAR(50),
    phone_number_id VARCHAR(50) UNIQUE,
    display_number  VARCHAR(30),
    display_name    VARCHAR(255),
    status          VARCHAR(30) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id                        VARCHAR(90) PRIMARY KEY,
    wa_id                     VARCHAR(30) NOT NULL,
    phone_number_id           VARCHAR(50),
    profile_name              VARCHAR(255),
    lead_id                   VARCHAR(100) REFERENCES leads(id),
    client_id                 VARCHAR(50)  REFERENCES clients(id),
    status                    VARCHAR(20)  DEFAULT 'open',
    unread_count              INT          DEFAULT 0,
    assigned_to               VARCHAR(100),
    last_message_at           TIMESTAMPTZ,
    last_inbound_at           TIMESTAMPTZ,
    first_inbound_at          TIMESTAMPTZ,
    first_response_at         TIMESTAMPTZ,
    service_window_expires_at TIMESTAMPTZ,
    source                    VARCHAR(50),
    referral                  JSONB DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (phone_number_id, wa_id)
  );

  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id              VARCHAR(150) PRIMARY KEY,
    conversation_id VARCHAR(90) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    direction       VARCHAR(10) NOT NULL,
    msg_type        VARCHAR(30),
    body            TEXT,
    media_id        VARCHAR(150),
    template_name   VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'received',
    error_text      TEXT,
    payload         JSONB DEFAULT '{}'::jsonb,
    ts              TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_wa_messages_conv_ts
    ON whatsapp_messages (conversation_id, ts DESC);

  CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id         VARCHAR(80) PRIMARY KEY,
    name       VARCHAR(255),
    language   VARCHAR(20),
    category   VARCHAR(50),
    status     VARCHAR(30),
    components JSONB DEFAULT '[]'::jsonb,
    synced_at  TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS webhook_event_logs (
    id          SERIAL PRIMARY KEY,
    source      VARCHAR(30),
    event_type  VARCHAR(60),
    payload     JSONB,
    processed   BOOLEAN DEFAULT FALSE,
    error_text  TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS lead_stage_history (
    id          SERIAL PRIMARY KEY,
    lead_id     VARCHAR(100) REFERENCES leads(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status   VARCHAR(50),
    changed_by  VARCHAR(100),
    ts          TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS followups (
    id         SERIAL PRIMARY KEY,
    lead_id    VARCHAR(100) REFERENCES leads(id) ON DELETE CASCADE,
    title      VARCHAR(255),
    due_at     TIMESTAMPTZ,
    status     VARCHAR(20) DEFAULT 'pending',
    owner      VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS default_assignee VARCHAR(100);
  ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS assignment_mode VARCHAR(20) DEFAULT 'none';

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS wa_id VARCHAR(30);
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ;
`;

let schemaEnsured = false;
async function ensureWhatsappSchema() {
  if (schemaEnsured) return;           // per warm lambda instance
  await db.query(SCHEMA_SQL);
  schemaEnsured = true;
}

// --- Config --------------------------------------------------
function getWaConfig() {
  return {
    verifyToken: process.env.WA_WEBHOOK_VERIFY_TOKEN
              || process.env.WEBHOOK_VERIFY_TOKEN
              || 'fwl-crm_secure_token_2026',
    appSecret:   process.env.WA_APP_SECRET || process.env.META_APP_SECRET || '',
    token:       process.env.WA_TOKEN || '',
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID || '',
    wabaId:        process.env.WA_WABA_ID || '',
  };
}

// --- Write-endpoint auth (extension-ready; enforced Batch 7) -
// NOTE: this repo currently has NO auth middleware anywhere.
// Set CRM_API_KEY in Vercel and pass X-CRM-Key from the UI to enforce.
function checkWriteAuth(req) {
  const key = process.env.CRM_API_KEY;
  if (!key) return true;                       // not configured yet
  return req.headers['x-crm-key'] === key;
}

// --- Phone normalization (India-first, matches convert.js) ---
function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return '91' + digits;
  return digits;
}
function last10(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  return d.slice(-10);
}

// --- Account -> client routing --------------------------------
async function getAccountClientId(phoneNumberId) {
  try {
    const { rows } = await db.query(
      'SELECT client_id FROM whatsapp_accounts WHERE phone_number_id = $1 LIMIT 1',
      [String(phoneNumberId)]
    );
    if (rows.length && rows[0].client_id) return rows[0].client_id;
  } catch (_) {}
  // Fallback: first client alphabetically (same fallback as leadgen webhook)
  try {
    const { rows } = await db.query('SELECT id FROM clients ORDER BY name ASC LIMIT 1');
    if (rows.length) return rows[0].id;
  } catch (_) {}
  return null;
}

// --- Lead match / create -------------------------------------
// Match order: leads.wa_id exact -> phone last-10-digit match.
// Creates a new lead with source='whatsapp' when no match found.
async function findOrCreateLead({ waId, profileName, clientId, referral }) {
  const norm = normalizePhone(waId);
  const tail = last10(waId);

  const byWaId = await db.query(
    'SELECT id, status FROM leads WHERE wa_id = $1 LIMIT 1', [norm]
  );
  if (byWaId.rows.length) return { lead: byWaId.rows[0], created: false };

  if (tail.length === 10) {
    const byPhone = await db.query(
      `SELECT id, status FROM leads
       WHERE RIGHT(REGEXP_REPLACE(COALESCE(phone,''), '\\D', '', 'g'), 10) = $1
       ORDER BY created_at DESC LIMIT 1`,
      [tail]
    );
    if (byPhone.rows.length) {
      await db.query('UPDATE leads SET wa_id = $1 WHERE id = $2',
        [norm, byPhone.rows[0].id]);
      return { lead: byPhone.rows[0], created: false };
    }
  }

  // Create new lead
  const name  = (profileName || '').trim() || ('WhatsApp ' + tail);
  const parts = name.split(' ');
  const first = parts[0];
  const last  = parts.slice(1).join(' ') || 'Lead';
  const id    = 'l_wa_' + norm + '_' + Date.now();
  const campaign = (referral && (referral.headline || referral.source_id))
    ? ('CTWA: ' + (referral.headline || referral.source_id))
    : 'WhatsApp Inbound';

  const { rows } = await db.query(`
    INSERT INTO leads (id, leadgen_id, name, first_name, last_name,
                       phone, email, status, source, client_id, campaign,
                       ad_id, wa_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, '', 'new', 'whatsapp', $7, $8, $9, $10, NOW())
    ON CONFLICT (leadgen_id) DO NOTHING
    RETURNING id, status
  `, [id, 'wa_' + norm, name, first, last, '+' + norm, clientId, campaign,
      (referral && referral.source_id) || '', norm]);

  return { lead: rows[0] || null, created: rows.length > 0 };
}

// --- Activity log helper -------------------------------------
async function logActivity(leadId, type, text, userName) {
  if (!leadId) return;
  try {
    await db.query(
      'INSERT INTO activities (lead_id, type, text, user_name, ts) VALUES ($1,$2,$3,$4,NOW())',
      [leadId, type, text, userName || 'WhatsApp']
    );
  } catch (e) { console.error('activity log failed:', e.message); }
}

// --- Webhook event audit log ---------------------------------
async function logWebhookEvent(source, eventType, payload, processed, errorText) {
  try {
    const { rows } = await db.query(
      `INSERT INTO webhook_event_logs (source, event_type, payload, processed, error_text)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [source, eventType, JSON.stringify(payload), !!processed, errorText || null]
    );
    return rows[0].id;
  } catch (e) { console.error('event log failed:', e.message); return null; }
}


// --- Assignment rules (Batch 4) -------------------------------
// Modes on whatsapp_accounts.assignment_mode:
//   'none'        - leave unassigned
//   'default'     - always default_assignee
//   'round_robin' - active agent with fewest open conversations
async function applyAssignment(conversationId, phoneNumberId) {
  try {
    const { rows: acct } = await db.query(
      'SELECT default_assignee, assignment_mode FROM whatsapp_accounts WHERE phone_number_id = $1 LIMIT 1',
      [String(phoneNumberId)]
    );
    const mode = acct[0] ? (acct[0].assignment_mode || 'none') : 'none';
    let assignee = null;

    if (mode === 'default' && acct[0].default_assignee) {
      assignee = acct[0].default_assignee;
    } else if (mode === 'round_robin') {
      const { rows } = await db.query(`
        SELECT a.id, COUNT(c.id) AS open_count
        FROM agents a
        LEFT JOIN whatsapp_conversations c
          ON c.assigned_to = a.id AND c.status = 'open'
        WHERE a.status = 'active'
        GROUP BY a.id
        ORDER BY open_count ASC, a.id ASC
        LIMIT 1
      `);
      if (rows.length) assignee = rows[0].id;
    }

    if (assignee) {
      await db.query(
        'UPDATE whatsapp_conversations SET assigned_to = $1 WHERE id = $2 AND assigned_to IS NULL',
        [assignee, conversationId]
      );
      return assignee;
    }
  } catch (e) { console.error('assignment failed:', e.message); }
  return null;
}

module.exports = {
  ensureWhatsappSchema,
  getWaConfig,
  checkWriteAuth,
  normalizePhone,
  last10,
  getAccountClientId,
  findOrCreateLead,
  logActivity,
  logWebhookEvent,
  applyAssignment,
};
