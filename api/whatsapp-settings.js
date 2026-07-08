// ============================================================
// FWL CRM - WhatsApp settings API
// GET /api/whatsapp-settings -> accounts + env readiness (no secrets)
// PUT /api/whatsapp-settings -> upsert account row
// ============================================================
const db = require('./_db');
const wa = require('./_whatsapp');

export default async function handler(req, res) {
  await wa.ensureWhatsappSchema();

  if (req.method === 'GET') {
    try {
      const cfg = wa.getWaConfig();
      const { rows } = await db.query(`
        SELECT a.*, c.name AS client_name
        FROM whatsapp_accounts a
        LEFT JOIN clients c ON c.id = a.client_id
        ORDER BY a.created_at ASC
      `);
      res.status(200).json({
        webhookUrl: 'https://fwl-crm.vercel.app/api/whatsapp-webhook',
        verifyTokenConfigured: !!cfg.verifyToken,
        appSecretConfigured: !!cfg.appSecret,
        tokenConfigured: !!cfg.token,           // never expose values
        wabaIdConfigured: !!cfg.wabaId,
        accounts: rows.map(a => ({
          id: a.id, clientId: a.client_id, clientName: a.client_name,
          wabaId: a.waba_id, phoneNumberId: a.phone_number_id,
          displayNumber: a.display_number, displayName: a.display_name,
          status: a.status, defaultAssignee: a.default_assignee,
          assignmentMode: a.assignment_mode || 'none',
        })),
        compliance: {
          optIn: 'Users must opt in before proactive outreach. Inbound messages imply a 24h service window.',
          window: 'Freeform replies only within 24h of the last inbound message; templates required after.',
          templates: 'Templates must be approved in WhatsApp Manager before use.',
        },
      });
    } catch (err) {
      console.error('WA settings error:', err);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }

  } else if (req.method === 'PUT') {
    if (!wa.checkWriteAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { id, clientId, wabaId, phoneNumberId, displayNumber,
              displayName, status, defaultAssignee, assignmentMode } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const { rows } = await db.query(`
        INSERT INTO whatsapp_accounts
          (id, client_id, waba_id, phone_number_id, display_number,
           display_name, status, default_assignee, assignment_mode)
        VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'pending'),$8,COALESCE($9,'none'))
        ON CONFLICT (id) DO UPDATE SET
          client_id = COALESCE($2, whatsapp_accounts.client_id),
          waba_id = COALESCE($3, whatsapp_accounts.waba_id),
          phone_number_id = COALESCE($4, whatsapp_accounts.phone_number_id),
          display_number = COALESCE($5, whatsapp_accounts.display_number),
          display_name = COALESCE($6, whatsapp_accounts.display_name),
          status = COALESCE($7, whatsapp_accounts.status),
          default_assignee = $8,
          assignment_mode = COALESCE($9, whatsapp_accounts.assignment_mode)
        RETURNING *
      `, [id, clientId, wabaId, phoneNumberId, displayNumber,
          displayName, status, defaultAssignee || null, assignmentMode]);

      res.status(200).json(rows[0]);
    } catch (err) {
      console.error('WA settings update error:', err);
      res.status(500).json({ error: 'Failed to update settings' });
    }

  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end('Method ' + req.method + ' Not Allowed');
  }
}
