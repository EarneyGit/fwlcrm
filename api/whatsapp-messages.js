// ============================================================
// FWL CRM - WhatsApp messages API
// GET  /api/whatsapp-messages?conversationId=   -> thread
// POST /api/whatsapp-messages
//   { conversationId, text }                     -> freeform (24h window only)
//   { conversationId, templateName, language, bodyParams: [] } -> template
// Requires WA_TOKEN env for sending.
// ============================================================
const db = require('./_db');
const wa = require('./_whatsapp');

async function getConversation(id) {
  const { rows } = await db.query('SELECT * FROM whatsapp_conversations WHERE id = $1', [id]);
  return rows[0] || null;
}

async function sendToMeta(phoneNumberId, payload, token) {
  const r = await fetch(
    'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload),
    }
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ? data.error.message : ('HTTP ' + r.status));
  return data;
}

export default async function handler(req, res) {
  await wa.ensureWhatsappSchema();

  if (req.method === 'GET') {
    try {
      const { conversationId } = req.query;
      if (!conversationId) return res.status(400).json({ error: 'Missing conversationId' });

      const conv = await getConversation(conversationId);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      const { rows } = await db.query(`
        SELECT id, direction, msg_type, body, media_id, template_name,
               status, error_text, ts
        FROM whatsapp_messages
        WHERE conversation_id = $1
        ORDER BY ts ASC
        LIMIT 500
      `, [conversationId]);

      res.status(200).json({
        conversation: {
          id: conv.id,
          waId: conv.wa_id,
          profileName: conv.profile_name,
          leadId: conv.lead_id,
          status: conv.status,
          assignedTo: conv.assigned_to,
          windowOpen: conv.service_window_expires_at
            ? new Date(conv.service_window_expires_at) > new Date() : false,
          serviceWindowExpiresAt: conv.service_window_expires_at,
        },
        messages: rows.map(m => ({
          id: m.id, direction: m.direction, type: m.msg_type, body: m.body,
          mediaId: m.media_id, templateName: m.template_name,
          status: m.status, errorText: m.error_text, ts: m.ts,
        })),
      });
    } catch (err) {
      console.error('WA messages error:', err);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }

  } else if (req.method === 'POST') {
    if (!wa.checkWriteAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { conversationId, text, templateName, language, bodyParams } = req.body;
      if (!conversationId) return res.status(400).json({ error: 'Missing conversationId' });

      const conv = await getConversation(conversationId);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      const cfg = wa.getWaConfig();
      if (!cfg.token) {
        return res.status(422).json({
          error: 'WA_TOKEN not configured. Add the Cloud API access token in Vercel env to enable sending.',
        });
      }
      const phoneNumberId = conv.phone_number_id || cfg.phoneNumberId;
      if (!phoneNumberId) return res.status(422).json({ error: 'No phone_number_id for this conversation' });

      const windowOpen = conv.service_window_expires_at
        && new Date(conv.service_window_expires_at) > new Date();

      let payload, msgType, body, tmpl = null;

      if (templateName) {
        // Outbound template (allowed anytime; must be approved in WhatsApp Manager)
        payload = {
          messaging_product: 'whatsapp',
          to: conv.wa_id,
          type: 'template',
          template: {
            name: templateName,
            language: { code: language || 'en' },
            components: (bodyParams && bodyParams.length)
              ? [{ type: 'body', parameters: bodyParams.map(p => ({ type: 'text', text: String(p) })) }]
              : undefined,
          },
        };
        msgType = 'template';
        body = '[template: ' + templateName + ']';
        tmpl = templateName;
      } else if (text) {
        // Freeform - only inside the 24h service window (Meta policy)
        if (!windowOpen) {
          return res.status(409).json({
            error: '24h service window closed. Use an approved template to re-engage.',
            windowClosed: true,
          });
        }
        payload = {
          messaging_product: 'whatsapp',
          to: conv.wa_id,
          type: 'text',
          text: { body: text, preview_url: false },
        };
        msgType = 'text';
        body = text;
      } else {
        return res.status(400).json({ error: 'Provide text or templateName' });
      }

      const result = await sendToMeta(phoneNumberId, payload, cfg.token);
      const wamid = result.messages && result.messages[0] ? result.messages[0].id : ('out_' + Date.now());

      await db.query(`
        INSERT INTO whatsapp_messages
          (id, conversation_id, direction, msg_type, body, template_name, status, payload, ts)
        VALUES ($1,$2,'out',$3,$4,$5,'sent',$6,NOW())
        ON CONFLICT (id) DO NOTHING
      `, [wamid, conv.id, msgType, body, tmpl, JSON.stringify(payload)]);

      // First-response tracking + last message bump
      await db.query(`
        UPDATE whatsapp_conversations
        SET last_message_at = NOW(),
            first_response_at = COALESCE(first_response_at, NOW())
        WHERE id = $1
      `, [conv.id]);

      if (conv.lead_id) {
        await wa.logActivity(conv.lead_id, 'whatsapp',
          'Outbound WhatsApp ' + (tmpl ? ('template "' + tmpl + '"') : 'message') +
          ': "' + body.slice(0, 120) + '"', 'CRM');
      }

      res.status(201).json({ id: wamid, status: 'sent' });
    } catch (err) {
      console.error('WA send error:', err);
      res.status(502).json({ error: 'Send failed: ' + err.message });
    }

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end('Method ' + req.method + ' Not Allowed');
  }
}
