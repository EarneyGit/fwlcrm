const db = require('../../_db');
const crypto = require('crypto');
const env = require('../../_env');
const { uploadGoogleConversion } = require('../../_google_conversions');

function sha256(str) {
  return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
}

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return '91' + digits;
  return digits;
}

function deriveSourcePlatform(lead) {
  if (lead.source_platform) return lead.source_platform;
  if (lead.gclid || lead.gbraid || lead.wbraid) return 'google';
  if (lead.source === 'whatsapp') return 'whatsapp';
  if (lead.source === 'facebook' || lead.source === 'instagram') return 'meta';
  if (lead.source === 'referral') return 'referral';
  if (lead.source === 'phone') return 'phone';
  return 'manual';
}

async function sendMetaPurchase(lead, value, contentName) {
  const userData = {};
  if (lead.email) {
    userData.em = [sha256(lead.email)];
  }
  if (lead.phone) {
    const normPhone = normalizePhone(lead.phone);
    if (normPhone) {
      userData.ph = [sha256(normPhone)];
    }
  }

  const eventPayload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: 'crm_convert_' + lead.id,
        action_source: 'crm',
        user_data: userData,
        custom_data: {
          currency: 'INR',
          value: Number(value),
          content_name: contentName || 'Service'
        }
      }
    ]
  };

  const pixelId = env.getEnv('META_PIXEL_ID');
  const capiToken = env.getEnv('META_CAPI_TOKEN');
  if (!(pixelId && capiToken)) {
    return { skipped: true, reason: 'META_PIXEL_ID or META_CAPI_TOKEN missing' };
  }

  const capiUrl = `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${capiToken}`;
  console.log('Sending CAPI Purchase event for lead:', lead.id);
  const capiRes = await fetch(capiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventPayload)
  });

  const capiData = await capiRes.json();
  console.log('CAPI Response status:', capiRes.status);
  return capiData;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { id } = req.query;
    const { value, content_name } = req.body;

    if (value === undefined || isNaN(value)) {
      return res.status(400).json({ error: 'Valid value is required' });
    }

    const { rows: leadRows } = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadRows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const lead = leadRows[0];

    if (lead.converted_at) {
      return res.status(400).json({ error: 'Lead already converted' });
    }

    const sourcePlatform = deriveSourcePlatform(lead);
    let capiData = { skipped: true, reason: 'Not a Meta-attributed lead' };
    let googleData = { skipped: true, status: 'not_applicable', reason: 'Not a Google-attributed lead' };

    if (sourcePlatform === 'google') {
      try {
        googleData = await uploadGoogleConversion(lead, { value, contentName: content_name });
      } catch (err) {
        googleData = {
          skipped: false,
          status: 'error',
          reason: err.message || 'Google Ads upload failed',
          response: err.payload || null,
        };
      }
    } else {
      capiData = await sendMetaPurchase(lead, value, content_name);
    }

    await db.query(`
      UPDATE leads 
      SET status = 'converted', converted_at = NOW(), conversion_value = $1,
          google_conversion_uploaded_at = CASE WHEN $3 = 'uploaded' THEN NOW() ELSE google_conversion_uploaded_at END,
          google_conversion_status = CASE WHEN $2 = 'google' THEN $3 ELSE google_conversion_status END,
          google_conversion_error = CASE WHEN $2 = 'google' AND $4 <> '' THEN $4 ELSE google_conversion_error END
      WHERE id = $5
    `, [
      value,
      sourcePlatform,
      googleData.status || null,
      googleData.status === 'uploaded' ? '' : (googleData.reason || ''),
      id,
    ]);

    const activityLines = [`Converted for ₹${value} (${content_name || 'Service'})`];
    if (sourcePlatform === 'google') {
      activityLines.push(`Google conversion ${googleData.status || 'unknown'}${googleData.reason ? ` — ${googleData.reason}` : ''}`);
    }
    await db.query(`
      INSERT INTO activities (lead_id, type, text, user_name)
      VALUES ($1, 'status_change', $2, 'System')
    `, [id, activityLines.join(' · ')]);

    return res.status(200).json({
      success: true,
      source_platform: sourcePlatform,
      capi_response: capiData,
      google_conversion: googleData,
    });

  } catch (err) {
    console.error('Convert API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
