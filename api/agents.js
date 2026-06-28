const db = require('./_db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { rows } = await db.query(`
      SELECT id, name, initials, color, role, email, status
      FROM agents
      ORDER BY name ASC
    `);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Agents error:', err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
}
