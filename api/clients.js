const db = require('./_db');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await db.query('SELECT * FROM clients ORDER BY name ASC');
      // Convert snake_case to camelCase for the frontend
      const clients = rows.map(r => ({
        id: r.id,
        name: r.name,
        industry: r.industry,
        city: r.city,
        color: r.color,
        icon: r.icon,
        accountId: r.account_id,
        forms: r.forms,
        tokenDays: r.token_days,
        status: r.status,
        leadsToday: r.leads_today,
        cpl: parseFloat(r.cpl),
        convRate: parseFloat(r.conv_rate),
        totalLeads: r.total_leads,
        campaigns: r.campaigns
      }));
      res.status(200).json(clients);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
