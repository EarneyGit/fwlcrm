// OAuth callback: exchanges code -> user token -> page tokens for ALL target pages,
// subscribes each page to the leadgen webhook, and upserts each as a CRM client
// (with its page token stored in the DB for per-page lead retrieval).
const db = require('./_db');

// Pages to connect to the CRM (account_id in clients table = Page ID)
const TARGET_PAGES = {
  '101448221738798': {
    id: 'earney', name: 'Earney Digital Service Solutions',
    industry: 'Digital Marketing', city: 'Chennai', color: '#1877F2', icon: '\u{1F4E3}',
  },
  '1142957065575295': {
    id: 'madras-crafters', name: 'Madras Crafters',
    industry: 'Construction', city: 'Chennai', color: '#F59E0B', icon: '\u{1F3D7}\u{FE0F}',
  },
  '1092278530646107': {
    id: 'sree-dhanalakshmi', name: 'Sree Dhanalakshmi Enterprises',
    industry: 'Building Materials', city: 'Chennai', color: '#10B981', icon: '\u{1F9F1}',
  },
};

module.exports = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}#dashboard`);
  }

  const APP_ID     = process.env.META_APP_ID     || '2464733710694215';
  const APP_SECRET = process.env.META_APP_SECRET || '';
  const REDIRECT   = 'https://fwl-crm.vercel.app/api/oauth';
  const BUSINESS_ID = '101672118766242';

  // No code = initiate the OAuth flow
  if (!code) {
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'leads_retrieval',
      'pages_manage_ads',
      'ads_management',
      'business_management',
    ].join(',');
    const loginUrl =
      `https://www.facebook.com/v20.0/dialog/oauth` +
      `?client_id=${APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&state=fwlcrm_oauth`;
    return res.redirect(loginUrl);
  }

  try {
    // 1. Exchange code for User Access Token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}` +
      `&client_secret=${APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(400).send('Token exchange failed: ' + JSON.stringify(tokenData));
    }
    const userToken = tokenData.access_token;

    // 2. Collect page tokens from all three sources
    const foundPages = {}; // pageId -> { name, access_token }
    const sources = [
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&limit=100&access_token=${userToken}`,
      `https://graph.facebook.com/v19.0/${BUSINESS_ID}/owned_pages?fields=id,name,access_token&limit=100&access_token=${userToken}`,
      `https://graph.facebook.com/v19.0/${BUSINESS_ID}/client_pages?fields=id,name,access_token&limit=100&access_token=${userToken}`,
    ];
    for (const url of sources) {
      try {
        const r = await fetch(url);
        const d = await r.json();
        if (r.ok && d.data) {
          for (const p of d.data) {
            if (p.access_token && !foundPages[p.id]) {
              foundPages[p.id] = { name: p.name, access_token: p.access_token };
            }
          }
        }
      } catch (_) { /* keep going */ }
    }

    // 3. Ensure page_token column exists (idempotent)
    await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS page_token TEXT`);

    // 4. For each target page: upsert client row + subscribe to leadgen webhook
    const results = [];
    for (const [pageId, meta] of Object.entries(TARGET_PAGES)) {
      const page = foundPages[pageId];
      if (!page) {
        results.push({ page: meta.name, pageId, status: 'FAILED - page token not found (no admin access via OAuth?)' });
        continue;
      }

      await db.query(
        `INSERT INTO clients (id, name, industry, city, color, icon, account_id, forms, token_days, status, leads_today, cpl, conv_rate, total_leads, campaigns, page_token)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,60,'connected',0,0,0,0,0,$8)
         ON CONFLICT (id) DO UPDATE SET name=$2, account_id=$7, page_token=$8, status='connected', token_days=60`,
        [meta.id, meta.name, meta.industry, meta.city, meta.color, meta.icon, pageId, page.access_token]
      );

      const subRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscribed_fields: ['leadgen'], access_token: page.access_token }),
        }
      );
      const subData = await subRes.json();
      results.push({
        page: meta.name, pageId,
        status: subData.success ? 'OK - subscribed + client saved' : 'PARTIAL - client saved, subscribe: ' + JSON.stringify(subData),
      });
    }

    // 5. Report
    const otherPages = Object.entries(foundPages)
      .filter(([id]) => !TARGET_PAGES[id])
      .map(([id, p]) => `${p.name} (${id})`).join('<br>') || 'none';

    return res.send(`
      <html><body style="font-family:monospace;padding:20px">
        <h2>OAuth Setup Complete</h2>
        <table border="1" cellpadding="6" style="border-collapse:collapse">
          <tr><th>Page</th><th>Page ID</th><th>Result</th></tr>
          ${results.map(r => `<tr><td>${r.page}</td><td>${r.pageId}</td><td>${r.status}</td></tr>`).join('')}
        </table>
        <p><b>Other pages you granted (not connected):</b><br>${otherPages}</p>
        <a href="/#dashboard">&larr; Go to Dashboard</a>
      </body></html>
    `);
  } catch (err) {
    return res.status(500).send('Error: ' + err.message);
  }
};
