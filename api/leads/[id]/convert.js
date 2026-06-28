const db = require('../../_db');
const crypto = require('crypto');

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

    // Lookup lead
    const { rows: leadRows } = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadRows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const lead = leadRows[0];

    // Check if already converted
    if (lead.converted_at) {
      return res.status(400).json({ error: 'Lead already converted' });
    }

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
            content_name: content_name || 'Service'
          }
        }
      ]
    };

    const capiUrl = `https://graph.facebook.com/v20.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`;
    
    console.log('Sending CAPI event:', JSON.stringify(eventPayload));
    
    const capiRes = await fetch(capiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload)
    });

    const capiData = await capiRes.json();
    console.log('CAPI Response:', capiData);

    // Update DB to mark as converted
    await db.query(`
      UPDATE leads 
      SET status = 'converted', converted_at = NOW(), conversion_value = $1 
      WHERE id = $2
    `, [value, id]);

    // Also add an activity record
    await db.query(`
      INSERT INTO activities (lead_id, type, text, user_name)
      VALUES ($1, 'status_change', $2, 'System')
    `, [id, `Converted for ₹${value} (${content_name || 'Service'})`]);

    return res.status(200).json({ success: true, capi_response: capiData });

  } catch (err) {
    console.error('Convert API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
