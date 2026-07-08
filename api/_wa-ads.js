// ============================================================
// FWL CRM - Live ads list for manual-lead attribution
// GET /api/meta-ads?clientId=   (rewritten to /api/whatsapp?r=ads)
// Lists ACTIVE ads from the ad account, mapped to pages/clients
// via each ad creative's effective_object_story_id.
// Requires meta_user_token in app_settings (stored by /api/oauth).
// ============================================================
const db = require('./_db');
const wa = require('./_whatsapp');

const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID || '898186284241803';

// Warm-lambda cache (5 min) to keep Graph API calls low
let cache = { at: 0, ads: null };

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method ' + req.method + ' Not Allowed');
  }
  await wa.ensureWhatsappSchema();

  try {
    const token = await wa.getSetting('meta_user_token');
    if (!token) {
      return res.status(422).json({
        error: 'No Meta token stored. Open /api/oauth once to authorize, then retry.',
      });
    }

    let ads = cache.ads;
    if (!ads || Date.now() - cache.at > 5 * 60 * 1000) {
      const url =
        'https://graph.facebook.com/v19.0/act_' + AD_ACCOUNT + '/ads' +
        '?fields=id,name,effective_status,campaign{name},adset{name},creative{effective_object_story_id}' +
        '&effective_status=["ACTIVE"]&limit=100&access_token=' + token;
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) {
        const msg = d.error ? d.error.message : 'Graph error';
        const expired = d.error && (d.error.code === 190);
        return res.status(502).json({
          error: msg + (expired ? ' - token expired, re-run /api/oauth' : ''),
        });
      }
      ads = (d.data || []).map(a => ({
        adId: a.id,
        adName: a.name,
        campaignName: a.campaign ? a.campaign.name : '',
        adsetName: a.adset ? a.adset.name : '',
        pageId: (a.creative && a.creative.effective_object_story_id)
          ? a.creative.effective_object_story_id.split('_')[0] : null,
      }));
      cache = { at: Date.now(), ads };
    }

    // Map pageId -> clientId (clients.account_id stores the Page ID)
    const { rows: clients } = await db.query('SELECT id, account_id FROM clients');
    const pageToClient = {};
    for (const c of clients) pageToClient[String(c.account_id)] = c.id;

    let out = ads.map(a => ({ ...a, clientId: a.pageId ? pageToClient[a.pageId] || null : null }));
    const { clientId } = req.query;
    if (clientId && clientId !== 'all') {
      // Show that client's ads first, but keep unmatched ads available
      out = out.filter(a => a.clientId === clientId || a.clientId === null);
    }
    res.status(200).json(out);
  } catch (err) {
    console.error('meta-ads error:', err);
    res.status(500).json({ error: 'Failed to fetch live ads' });
  }
};
