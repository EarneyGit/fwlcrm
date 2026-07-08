// ============================================================
// FWL CRM - WhatsApp analytics API (Batch 6)
// GET /api/analytics-whatsapp
// ============================================================
const db = require('./_db');
const wa = require('./_whatsapp');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method ' + req.method + ' Not Allowed');
  }
  await wa.ensureWhatsappSchema();

  try {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM whatsapp_conversations)                        AS total_conversations,
        (SELECT COUNT(*) FROM whatsapp_conversations WHERE status='open')    AS open_conversations,
        (SELECT COALESCE(SUM(unread_count),0) FROM whatsapp_conversations)   AS unread_total,
        (SELECT COUNT(*) FROM whatsapp_messages WHERE direction='in')        AS inbound_messages,
        (SELECT COUNT(*) FROM whatsapp_messages WHERE direction='out')       AS outbound_messages,
        (SELECT COUNT(*) FROM leads WHERE source='whatsapp')                 AS wa_leads,
        (SELECT COUNT(*) FROM leads WHERE source='whatsapp' AND status='contacted') AS wa_contacted,
        (SELECT COUNT(*) FROM leads WHERE source='whatsapp' AND status='qualified') AS wa_qualified,
        (SELECT COUNT(*) FROM leads WHERE source='whatsapp' AND status='converted') AS wa_converted,
        (SELECT COUNT(*) FROM leads WHERE source='whatsapp' AND status='lost')      AS wa_lost,
        (SELECT COALESCE(SUM(conversion_value),0) FROM leads WHERE source='whatsapp') AS wa_revenue,
        (SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - first_inbound_at)))
           FROM whatsapp_conversations
           WHERE first_response_at IS NOT NULL AND first_inbound_at IS NOT NULL) AS avg_first_response_s,
        (SELECT COUNT(*) FROM followups WHERE status='pending' AND due_at < NOW()) AS overdue_followups
    `);
    const r = rows[0];

    const { rows: byOwner } = await db.query(`
      SELECT COALESCE(wc.assigned_to, 'unassigned') AS owner,
             COUNT(DISTINCT wc.id) AS conversations,
             COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'converted') AS converted
      FROM whatsapp_conversations wc
      LEFT JOIN leads l ON l.id = wc.lead_id
      GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    `);

    const { rows: byClient } = await db.query(`
      SELECT c.name AS client, COUNT(wc.id) AS conversations,
             COALESCE(SUM(l.conversion_value),0) AS revenue
      FROM whatsapp_conversations wc
      LEFT JOIN clients c ON c.id = wc.client_id
      LEFT JOIN leads l ON l.id = wc.lead_id AND l.status = 'converted'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    `);

    res.status(200).json({
      totals: {
        conversations: +r.total_conversations,
        open: +r.open_conversations,
        unread: +r.unread_total,
        inboundMessages: +r.inbound_messages,
        outboundMessages: +r.outbound_messages,
      },
      leads: {
        total: +r.wa_leads, contacted: +r.wa_contacted, qualified: +r.wa_qualified,
        converted: +r.wa_converted, lost: +r.wa_lost, revenue: +r.wa_revenue,
      },
      avgFirstResponseSeconds: r.avg_first_response_s ? +r.avg_first_response_s : null,
      overdueFollowups: +r.overdue_followups,
      byOwner, byClient,
    });
  } catch (err) {
    console.error('WA analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
