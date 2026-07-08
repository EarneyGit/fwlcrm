// ============================================================
// FWL CRM - Follow-ups API
// GET   /api/followups?leadId=  | ?due=overdue | (all pending)
// POST  /api/followups  { leadId, title, dueAt, owner }
// PATCH /api/followups  { id, status }  ('done' | 'pending')
// ============================================================
const db = require('./_db');
const wa = require('./_whatsapp');

export default async function handler(req, res) {
  await wa.ensureWhatsappSchema();

  if (req.method === 'GET') {
    try {
      const { leadId, due } = req.query;
      const where = ["f.status = 'pending'"]; const vals = []; let i = 1;
      if (leadId) { where.push(`f.lead_id = $${i++}`); vals.push(leadId); }
      if (due === 'overdue') { where.push('f.due_at < NOW()'); }

      const { rows } = await db.query(`
        SELECT f.*, l.name AS lead_name
        FROM followups f
        LEFT JOIN leads l ON l.id = f.lead_id
        WHERE ${where.join(' AND ')}
        ORDER BY f.due_at ASC NULLS LAST
        LIMIT 200
      `, vals);

      res.status(200).json(rows.map(f => ({
        id: f.id, leadId: f.lead_id, leadName: f.lead_name, title: f.title,
        dueAt: f.due_at, status: f.status, owner: f.owner, createdAt: f.created_at,
        overdue: f.due_at ? new Date(f.due_at) < new Date() : false,
      })));
    } catch (err) {
      console.error('Followups error:', err);
      res.status(500).json({ error: 'Failed to fetch followups' });
    }

  } else if (req.method === 'POST') {
    if (!wa.checkWriteAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { leadId, title, dueAt, owner } = req.body;
      if (!leadId || !title) return res.status(400).json({ error: 'Missing leadId or title' });

      const { rows } = await db.query(`
        INSERT INTO followups (lead_id, title, due_at, owner)
        VALUES ($1,$2,$3,$4) RETURNING *
      `, [leadId, title, dueAt || null, owner || null]);

      if (dueAt) {
        await db.query(
          'UPDATE leads SET next_followup_at = $1 WHERE id = $2 AND (next_followup_at IS NULL OR next_followup_at > $1)',
          [dueAt, leadId]
        );
      }
      await wa.logActivity(leadId, 'followup', 'Follow-up scheduled: ' + title, owner || 'CRM');
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Followup create error:', err);
      res.status(500).json({ error: 'Failed to create followup' });
    }

  } else if (req.method === 'PATCH') {
    if (!wa.checkWriteAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { id, status } = req.body;
      if (!id || !status) return res.status(400).json({ error: 'Missing id or status' });

      const { rows } = await db.query(
        'UPDATE followups SET status = $1 WHERE id = $2 RETURNING *', [status, id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Followup not found' });

      const f = rows[0];
      if (status === 'done') {
        // Recompute the lead's next pending follow-up
        await db.query(`
          UPDATE leads SET next_followup_at = (
            SELECT MIN(due_at) FROM followups
            WHERE lead_id = $1 AND status = 'pending'
          ) WHERE id = $1
        `, [f.lead_id]);
        await wa.logActivity(f.lead_id, 'followup', 'Follow-up completed: ' + f.title, 'CRM');
      }
      res.status(200).json(f);
    } catch (err) {
      console.error('Followup update error:', err);
      res.status(500).json({ error: 'Failed to update followup' });
    }

  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    res.status(405).end('Method ' + req.method + ' Not Allowed');
  }
}
