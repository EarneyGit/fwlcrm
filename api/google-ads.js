const wa = require('./_whatsapp');
const googleAds = require('./_google_ads');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method ' + req.method + ' Not Allowed');
  }
  if (!wa.checkReadAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const clientId = String(req.query.clientId || '').trim();
    const config = await googleAds.resolveAdsConfig(clientId);

    if (config.missing.length) {
      return res.status(422).json({
        error: 'Google Ads is not configured yet',
        missing: config.missing,
        clientId,
        clientName: config.client ? config.client.name : null,
      });
    }

    const rows = await googleAds.fetchGoogleAdsRows(config);
    const ads = googleAds.normalizeAds(rows, clientId || (config.client && config.client.id) || null);
    return res.status(200).json(ads);
  } catch (err) {
    console.error('google-ads error:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Failed to fetch Google Ads data' });
  }
};
