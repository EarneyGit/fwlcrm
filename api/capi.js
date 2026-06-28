// ============================================================
// FWL CRM — Meta Conversions API (CAPI) event sender
// Sends server-side events to Meta pixel 1116116109133710
// Called internally when lead status changes
// ============================================================

const PIXEL_ID   = process.env.META_PIXEL_ID   || '1116116109133710';
const CAPI_TOKEN = process.env.META_CAPI_TOKEN  || '';
const CAPI_URL   = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;

// SHA-256 hash helper (CAPI requires hashed PII)
const crypto = require('crypto');
function sha256(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value).toLowerCase().trim()).digest('hex');
}

// Map CRM lead status → CAPI event name
const STATUS_EVENT_MAP = {
  contacted: 'Contact',
  qualified:  'Schedule',    // site visit / consultation booked
  converted:  'Purchase',    // deal closed
  new:        'Lead',        // new lead arrived
};

/**
 * Send a CAPI event to Meta.
 * @param {string} eventName  - Standard Meta event name (Lead, Contact, etc.)
 * @param {object} lead       - Lead row from the DB
 * @param {object} [extra]    - Extra custom_data (e.g. { currency, value })
 */
async function sendCapiEvent(eventName, lead, extra = {}) {
  if (!CAPI_TOKEN) {
    console.warn('META_CAPI_TOKEN not set — skipping CAPI event');
    return null;
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const eventId   = `capi_${lead.id}_${eventName}_${eventTime}`;

  const payload = {
    data: [{
      event_name:    eventName,
      event_time:    eventTime,
      event_id:      eventId,
      action_source: 'website',
      event_source_url: 'https://fwl-crm.vercel.app/',
      user_data: {
        em:  sha256(lead.email) ? [sha256(lead.email)]  : undefined,
        ph:  sha256(lead.phone) ? [sha256(lead.phone)]  : undefined,
        fn:  sha256(lead.first_name),
        ln:  sha256(lead.last_name),
        ct:  sha256(lead.city),
        client_user_agent: 'FWL-CRM-Server/1.0',
      },
      custom_data: {
        lead_id:    lead.id,
        client_id:  lead.client_id,
        campaign:   lead.campaign || '',
        status:     lead.status,
        ...extra,
      },
    }],
  };

  try {
    const response = await fetch(`${CAPI_URL}?access_token=${CAPI_TOKEN}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('CAPI error:', JSON.stringify(result));
    } else {
      console.log(`CAPI event sent: ${eventName} for lead ${lead.id} — events_received: ${result.events_received}`);
    }
    return result;
  } catch (err) {
    console.error('CAPI fetch failed:', err.message);
    return null;
  }
}

module.exports = { sendCapiEvent, STATUS_EVENT_MAP };
