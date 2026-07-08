// ============================================================
// FWL CRM - WhatsApp templates API
// GET  /api/whatsapp-templates            -> synced template list
// POST /api/whatsapp-templates {action:'sync'} -> pull from Meta
// Requires WA_TOKEN + WA_WABA_ID (or whatsapp_accounts.waba_id).
// ============================================================
const db = require('./_db');
const wa = require('./_whatsapp');

module.exports = async function handler(req, res) {
  await wa.ensureWhatsappSchema();

  if (req.method === 'GET') {
    try {
      const { rows } = await db.query(
        'SELECT * FROM whatsapp_templates ORDER BY name ASC'
      );
      res.status(200).json(rows.map(t => ({
        id: t.id, name: t.name, language: t.language, category: t.category,
        status: t.status, components: t.components, syncedAt: t.synced_at,
      })));
    } catch (err) {
      console.error('WA templates error:', err);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }

  } else if (req.method === 'POST') {
    if (!wa.checkWriteAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const cfg = wa.getWaConfig();
      let wabaId = cfg.wabaId;
      if (!wabaId) {
        const { rows } = await db.query(
          "SELECT waba_id FROM whatsapp_accounts WHERE waba_id IS NOT NULL AND waba_id != '' LIMIT 1"
        );
        if (rows.length) wabaId = rows[0].waba_id;
      }
      if (!cfg.token || !wabaId) {
        return res.status(422).json({
          error: 'WA_TOKEN and WA_WABA_ID (or a whatsapp_accounts row with waba_id) are required to sync.',
        });
      }

      const r = await fetch(
        'https://graph.facebook.com/v21.0/' + wabaId +
        '/message_templates?fields=id,name,language,category,status,components&limit=100',
        { headers: { Authorization: 'Bearer ' + cfg.token } }
      );
      const data = await r.json();
      if (!r.ok) {
        return res.status(502).json({ error: data.error ? data.error.message : 'Sync failed' });
      }

      let synced = 0;
      for (const t of data.data || []) {
        await db.query(`
          INSERT INTO whatsapp_templates (id, name, language, category, status, components, synced_at)
          VALUES ($1,$2,$3,$4,$5,$6,NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = $2, language = $3, category = $4, status = $5,
            components = $6, synced_at = NOW()
        `, [String(t.id), t.name, t.language, t.category, t.status,
            JSON.stringify(t.components || [])]);
        synced++;
      }
      res.status(200).json({ synced });
    } catch (err) {
      console.error('WA template sync error:', err);
      res.status(500).json({ error: 'Sync failed: ' + err.message });
    }

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end('Method ' + req.method + ' Not Allowed');
  }
}
