// One-time OAuth callback: exchanges code → user token → page token → subscribes page to leadgen webhook
module.exports = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}#dashboard`);
  }

  const APP_ID     = process.env.META_APP_ID     || '2464733710694215';
  const APP_SECRET = process.env.META_APP_SECRET || '';
  const REDIRECT   = 'https://fwl-crm.vercel.app/api/oauth';
  const PAGE_ID    = '101448221738798'; // Earney Digital Service Solutions

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

    const BUSINESS_ID = '101672118766242';

    // 2a. Try /me/accounts first
    let pageToken = null;
    let pageName = null;

    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${userToken}`
    );
    const accountsData = await accountsRes.json();
    if (accountsRes.ok && accountsData.data) {
      const found = accountsData.data.find(p => p.id === PAGE_ID);
      if (found) { pageToken = found.access_token; pageName = found.name; }
    }

    // 2b. Fall back to Business Manager owned_pages
    if (!pageToken) {
      const bizRes = await fetch(
        `https://graph.facebook.com/v19.0/${BUSINESS_ID}/owned_pages?fields=id,name,access_token&access_token=${userToken}`
      );
      const bizData = await bizRes.json();
      if (bizRes.ok && bizData.data) {
        const found = bizData.data.find(p => p.id === PAGE_ID);
        if (found) { pageToken = found.access_token; pageName = found.name; }
      }
    }

    // 2c. Fall back to client_pages (pages the user manages through the business)
    if (!pageToken) {
      const clientRes = await fetch(
        `https://graph.facebook.com/v19.0/${BUSINESS_ID}/client_pages?fields=id,name,access_token&access_token=${userToken}`
      );
      const clientData = await clientRes.json();
      if (clientRes.ok && clientData.data) {
        const found = clientData.data.find(p => p.id === PAGE_ID);
        if (found) { pageToken = found.access_token; pageName = found.name; }
      }
    }

    if (!pageToken) {
      // Debug: show all available pages across all sources
      const allPages = (accountsData.data || []).map(p => `${p.name} (${p.id})`).join(', ');
      return res.status(400).send(
        `Earney page (${PAGE_ID}) not found in /me/accounts, owned_pages, or client_pages.<br>` +
        `/me/accounts: ${allPages || 'none'}`
      );
    }

    // 3. Subscribe the page to leadgen webhook events
    const subRes = await fetch(
      `https://graph.facebook.com/v19.0/${PAGE_ID}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: ['leadgen'],
          access_token: pageToken,
        }),
      }
    );
    const subData = await subRes.json();

    // 4. Return result
    const status = subData.success ? 'SUCCESS' : 'PARTIAL';
    return res.send(`
      <html><body style="font-family:monospace;padding:20px">
        <h2>✅ OAuth Setup Complete</h2>
        <p><b>Page:</b> ${pageName} (${PAGE_ID})</p>
        <p><b>Page Token (first 40 chars):</b> ${pageToken.substring(0, 40)}...</p>
        <p><b>Subscription result:</b> ${JSON.stringify(subData)}</p>
        <p><b>Status:</b> ${status}</p>
        <hr>
        <p>Copy the page token below and add it to Vercel as <code>META_PAGE_ACCESS_TOKEN</code>:</p>
        <textarea rows="4" cols="80">${pageToken}</textarea>
        <br><br>
        <a href="/#dashboard">← Go to Dashboard</a>
      </body></html>
    `);
  } catch (err) {
    return res.status(500).send('Error: ' + err.message);
  }
};
