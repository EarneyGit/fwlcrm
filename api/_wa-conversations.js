// ============================================================
// FWL CRM - WhatsApp conversations API
// GET   /api/whatsapp-conversations?status=&clientId=&assigned=&unread=&q=
// PATCH /api/whatsapp-conversations  { id, assignedTo?, status?, markRead? }
// ============================================================
const db = require('./_db');
const wa = require('./_whatsapp');

module.exports = async function handler(req, res) {
  await wa.ensureWhatsappSchema();

  if (req.method === 'GET') {
    try {
      const { status, clientId, assigned, unread, q } = req.query;
      const where = [];
      const vals = [];
      let i = 1;

      if (status && status !== 'all') { where.push(`wc.status = $${i++}`); vals.push(status); }
      if (clientId && clientId !== 'all') { where.push(`wc.client_id = $${i++}`); vals.push(clientId); }
      if (assigned === 'unassigned') { where.push('wc.assigned_to IS NULL'); }
      else if (assigned && assigned !== 'all') { where.push(`wc.assigned_to = $${i++}`); vals.push(assigned); }
      if (unread === '1') { where.push('wc.unread_count > 0'); }
      if (q) {
        where.push(`(wc.wa_id ILIKE $${i} OR wc.profile_name ILIKE $${i} OR l.name ILIKE $${i} OR l.campaign ILIKE $${i})`);
        vals.push('%' + q + '%'); i++;
      }

      const sql = `
        SELECT wc.*,
               l.name AS lead_name, l.status AS lead_status, l.campaign AS lead_campaign,
               c.name AS client_name, c.color AS client_color,
               (SELECT body FROM whatsapp_messages m
                WHERE m.conversation_id = wc.id ORDER BY m.ts DESC LIMIT 1) AS last_body
        FROM whatsapp_conversations wc
        LEFT JOIN leads l   ON l.id = wc.lead_id
        LEFT JOIN clients c ON c.id = wc.client_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY wc.last_message_at DESC NULLS LAST
        LIMIT 100
      `;
      const { rows } = await db.query(sql, vals);

      res.status(200).json(rows.map(r => ({
        id: r.id,
        waId: r.wa_id,
        phoneNumberId: r.phone_number_id,
        profileName: r.profile_name,
        leadId: r.lead_id,
        leadName: r.lead_name,
        leadStatus: r.lead_status,
        leadCampaign: r.lead_campaign,
        clientId: r.client_id,
        clientName: r.client_name,
        clientColor: r.client_color,
        status: r.status,
        unreadCount: r.unread_count,
        assignedTo: r.assigned_to,
        lastBody: r.last_body,
        lastMessageAt: r.last_message_at,
        lastInboundAt: r.last_inbound_at,
        firstResponseAt: r.first_response_at,
        serviceWindowExpiresAt: r.service_window_expires_at,
        windowOpen: r.service_window_expires_at
          ? new Date(r.service_window_expires_at) > new Date() : false,
        source: r.source,
        referral: r.referral,
        createdAt: r.created_at,
      })));
    } catch (err) {
      console.error('WA conversations error:', err);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }

  } else if (req.method === 'PATCH') {
    if (!wa.checkWriteAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { id, assignedTo, status, markRead } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const updates = []; const vals = []; let i = 1;
      if (assignedTo !== undefined) { updates.push(`assigned_to = $${i++}`); vals.push(assignedTo || null); }
      if (status)                   { updates.push(`status = $${i++}`); vals.push(status); }
      if (markRead)                 { updates.push('unread_count = 0'); }
      if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

      vals.push(id);
      const { rows } = await db.query(
        `UPDATE whatsapp_conversations SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, vals
      );
      if (!rows.length) return res.status(404).json({ error: 'Conversation not found' });

      const conv = rows[0];
      if (assignedTo !== undefined && conv.lead_id) {
        await wa.logActivity(conv.lead_id, 'assignment',
          assignedTo ? ('WhatsApp conversation assigned to ' + assignedTo)
                     : 'WhatsApp conversation unassigned', 'CRM');
      }
      if (status && conv.lead_id) {
        await wa.logActivity(conv.lead_id, 'whatsapp',
          'Conversation marked ' + status, 'CRM');
      }
      res.status(200).json(conv);
    } catch (err) {
      console.error('WA conversation update error:', err);
      res.status(500).json({ error: 'Failed to update conversation' });
    }

  } else {
    res.setHeader('Allow', ['GET', 'PATCH']);
    res.status(405).end('Method ' + req.method + ' Not Allowed');
  }
}
