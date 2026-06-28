// One-time OAuth callback: exchanges code → user token → page token → subscribes page to leadgen webhook
module.exports = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}#dashboard`);
  }

  if (!code) {
    return res.status(400).send('Missing code parameter');
  }

  const APP_ID     = process.env.META_APP_ID     || '2464733710694215';
  const APP_SECRET = process.env.META_APP_SECRET || '';
  const REDIRECT   = 'https://fwl-crm.vercel.app/api/oauth';
  const PAGE_ID    = '101448221738798'; // Earney Digital Service Solutions

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

    // 2. Get Page Access Token from /me/accounts
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    );
    const accountsData = await accountsRes.json();
    if (!accountsRes.ok || !accountsData.data) {
      return res.status(400).send('Failed to get accounts: ' + JSON.stringify(accountsData));
    }

    // Find the Earney page token
    const earney = accountsData.data.find(p => p.id === PAGE_ID);
    if (!earney) {
      return res.status(400).send(
        `Earney page (${PAGE_ID}) not found in accounts. Found: ` +
        accountsData.data.map(p => `${p.name} (${p.id})`).join(', ')
      );
    }
    const pageToken = earney.access_token;

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
        <p><b>Page:</b> ${earney.name} (${PAGE_ID})</p>
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
