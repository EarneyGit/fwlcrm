const db = require('./_db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { rows } = await db.query(`
      WITH today AS (
        SELECT
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)                          AS leads_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
                             AND created_at  <  CURRENT_DATE)                         AS leads_yesterday,
          COUNT(*) FILTER (WHERE status IN ('won','converted'))                                      AS won_total,
          COUNT(*)                                                                     AS total_leads
        FROM leads
      ),
      response AS (
        -- Avg seconds between lead creation and first 'contacted' activity
        SELECT AVG(EXTRACT(EPOCH FROM (a.ts - l.created_at))) AS avg_response_seconds
        FROM leads l
        JOIN activities a ON a.lead_id = l.id AND a.type = 'contacted'
        WHERE a.ts = (
          SELECT MIN(ts) FROM activities
          WHERE lead_id = l.id AND type = 'contacted'
        )
        AND l.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ),
      cpl AS (
        SELECT AVG(cpl) AS avg_cpl FROM clients WHERE status != 'error'
      )
      SELECT
        t.leads_today,
        t.leads_yesterday,
        t.won_total,
        t.total_leads,
        ROUND(
          CASE WHEN t.total_leads > 0
            THEN (t.won_total::NUMERIC / t.total_leads) * 100
            ELSE 0
          END, 1
        ) AS conv_rate,
        COALESCE(r.avg_response_seconds, 0) AS avg_response,
        COALESCE(c.avg_cpl, 0)              AS avg_cpl
      FROM today t, response r, cpl c
    `);

    const row = rows[0];
    res.status(200).json({
      leadsToday:    parseInt(row.leads_today,    10),
      leadsYesterday:parseInt(row.leads_yesterday,10),
      wonTotal:      parseInt(row.won_total,      10),
      totalLeads:    parseInt(row.total_leads,    10),
      convRate:      `${row.conv_rate}%`,
      avgResponse:   parseFloat(row.avg_response),
      avgCPL:        parseFloat(row.avg_cpl),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
