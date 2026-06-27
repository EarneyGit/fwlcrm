const db = require('./_db');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Fetch leads and join with clients to get client name
      const query = `
        SELECT l.*, c.name as client_name, c.color as avatar_color
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
          assignedTo: r.assigned_to ? { name: r.assigned_to, initials: r.assigned_to[0], color: '#333' } : null,
          createdAt: r.created_at,
          slaBreached: r.sla_breached,
          initials,
          avatarColor: r.avatar_color || '#6C47FF',
          fieldData: r.field_data,
          activities: []
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
      res.status(200).json({ success: true, lead: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
