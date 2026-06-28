const db = require('./_db');
const { sendCapiEvent, STATUS_EVENT_MAP } = require('./capi');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Fetch leads and join with clients and activities
      const query = `
        SELECT 
          l.*, 
          c.name as client_name, 
          c.color as avatar_color,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', a.id,
              'type', a.type,
              'text', a.text,
              'user', a.user_name,
              'ts', a.ts
            ) ORDER BY a.ts DESC) 
            FROM activities a WHERE a.lead_id = l.id),
            '[]'::json
          ) as activities
        FROM leads l
        LEFT JOIN clients c ON l.client_id = c.id
        ORDER BY l.created_at DESC
        LIMIT 100
      `;
      const { rows } = await db.query(query);
      
      const leads = rows.map(r => {
        const initials = r.first_name && r.last_name 
          ? (r.first_name[0] + r.last_name[0]).toUpperCase()
          : 'L';
        return {
          id: r.id,
          leadgenId: r.leadgen_id,
          name: r.name,
          firstName: r.first_name,
          lastName: r.last_name,
          phone: r.phone,
          email: r.email,
          city: r.city,
          status: r.status,
          source: r.source,
          clientId: r.client_id,
          clientName: r.client_name,
          campaign: r.campaign,
          adId: r.ad_id,
          avatarColor: r.avatar_color || '#6C47FF',
          fieldData: r.field_data,
          activities: r.activities || [],
          assignedTo: r.assigned_to,
          createdAt: r.created_at,
          slaBreached: r.sla_breached,
          initials
        };
      });
      res.status(200).json(leads);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, phone, email, clientId } = req.body;
      
      const [first, ...rest] = name.split(' ');
      const last = rest.join(' ') || 'Lead';
      
      const insertQuery = `
        INSERT INTO leads (id, leadgen_id, name, first_name, last_name, phone, email, status, source, client_id, campaign, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', 'manual', $8, 'Manual Entry', NOW())
        RETURNING *
      `;
      
      const id = 'l_manual_' + Date.now();
      const leadgenId = 'manual_' + Date.now();
      
      const { rows } = await db.query(insertQuery, [id, leadgenId, name, first, last, phone, email, clientId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { id, status, assigned_to } = req.body;
      let updates = [];
      let values = [];
      let i = 1;
      
      if (status) { updates.push(`status = $${i++}`); values.push(status); }
      if (assigned_to !== undefined) { updates.push(`assigned_to = $${i++}`); values.push(assigned_to); }
      
      if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
      
      values.push(id);
      const query = `UPDATE leads SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
      const { rows } = await db.query(query, values);
      
      if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

      // Fire CAPI event if status changed
      if (status && STATUS_EVENT_MAP[status]) {
        const lead = rows[0];
        const capiExtra = status === 'won'
          ? { currency: 'INR', value: lead.cpl || '0' }
 