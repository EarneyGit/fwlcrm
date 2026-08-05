const db = require('./_db');

const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v18';
let schemaEnsured = false;
let tokenCache = { accessToken: null, expiresAt: 0 };

async function ensureGoogleAdsSchema() {
  if (schemaEnsured) return;
  await db.query(`
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS google_customer_id TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS google_ads_enabled BOOLEAN DEFAULT FALSE;
  `);
  schemaEnsured = true;
}

function normalizeCustomerId(value) {
  return String(value || '').replace(/\D/g, '');
}

async function getClientConfig(clientId) {
  await ensureGoogleAdsSchema();
  if (!clientId) return null;
  const { rows } = await db.query(
    'SELECT id, name, google_customer_id, google_ads_enabled FROM clients WHERE id = $1 LIMIT 1',
    [clientId]
  );
  return rows[0] || null;
}

function getBaseEnvConfig() {
  return {
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
    loginCustomerId: normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''),
    defaultCustomerId: normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID || ''),
  };
}

function listMissingConfig(config) {
  const missing = [];
  if (!config.developerToken) missing.push('GOOGLE_ADS_DEVELOPER_TOKEN');
  if (!config.clientId) missing.push('GOOGLE_ADS_CLIENT_ID');
  if (!config.clientSecret) missing.push('GOOGLE_ADS_CLIENT_SECRET');
  if (!config.refreshToken) missing.push('GOOGLE_ADS_REFRESH_TOKEN');
  if (!config.customerId) missing.push('GOOGLE_ADS_CUSTOMER_ID or clients.google_customer_id');
  return missing;
}

async function resolveAdsConfig(clientId) {
  const envCfg = getBaseEnvConfig();
  const client = await getClientConfig(clientId);
  const customerId = normalizeCustomerId((client && client.google_customer_id) || envCfg.defaultCustomerId);
  const config = {
    ...envCfg,
    client,
    customerId,
  };
  config.missing = listMissingConfig(config);
  return config;
}

async function getAccessToken(config) {
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const message = (data.error_description || data.error || 'Failed to refresh Google Ads access token');
    const err = new Error(message);
    err.statusCode = 502;
    throw err;
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + ((Number(data.expires_in) || 3600) * 1000),
  };
  return tokenCache.accessToken;
}

async function fetchGoogleAdsRows(config) {
  const accessToken = await getAccessToken(config);
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      campaign.status,
      ad_group.status,
      ad_group_ad.status
    FROM ad_group_ad
    WHERE campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND ad_group_ad.status != 'REMOVED'
    LIMIT 200
  `;

  const res = await fetch(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${config.customerId}/googleAds:search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': config.developerToken,
      'Content-Type': 'application/json',
      ...(config.loginCustomerId ? { 'login-customer-id': config.loginCustomerId } : {}),
    },
    body: JSON.stringify({ query, pageSize: 200 }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || data?.error?.details?.[0]?.message || 'Failed to fetch Google Ads data';
    const err = new Error(message);
    err.statusCode = 502;
    throw err;
  }

  return data.results || [];
}

function normalizeAds(rows, clientId) {
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const campaign = row.campaign || {};
    const adGroup = row.adGroup || row.ad_group || {};
    const ad = (row.adGroupAd && row.adGroupAd.ad) || (row.ad_group_ad && row.ad_group_ad.ad) || {};
    const adId = String(ad.id || '').trim();
    const campaignId = String(campaign.id || '').trim();
    const adGroupId = String(adGroup.id || '').trim();
    const key = `${campaignId}:${adGroupId}:${adId}`;
    if (!adId || seen.has(key)) continue;
    seen.add(key);
    out.push({
      campaignId,
      campaignName: campaign.name || '',
      adGroupId,
      adGroupName: adGroup.name || '',
      adId,
      adName: ad.name || '',
      clientId,
    });
  }

  return out;
}

module.exports = {
  ensureGoogleAdsSchema,
  getClientConfig,
  resolveAdsConfig,
  fetchGoogleAdsRows,
  normalizeAds,
};
