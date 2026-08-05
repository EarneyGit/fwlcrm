const googleAds = require('./_google_ads');

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

function formatGoogleDateTime(value) {
  const date = value ? new Date(value) : new Date();
  const iso = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  return iso.slice(0, 19).replace('T', ' ') + '+00:00';
}

function chooseClickId(lead) {
  const gclid = firstNonEmpty(lead.gclid);
  if (gclid) return { field: 'gclid', value: gclid };
  const gbraid = firstNonEmpty(lead.gbraid);
  if (gbraid) return { field: 'gbraid', value: gbraid };
  const wbraid = firstNonEmpty(lead.wbraid);
  if (wbraid) return { field: 'wbraid', value: wbraid };
  return null;
}

async function uploadGoogleConversion(lead, { value, contentName }) {
  const config = await googleAds.resolveConversionConfig(lead.client_id);
  if (config.missing.length) {
    return {
      skipped: true,
      status: 'skipped',
      reason: 'Google Ads conversion config missing',
      missing: config.missing,
    };
  }

  const clickId = chooseClickId(lead);
  if (!clickId) {
    return {
      skipped: true,
      status: 'skipped',
      reason: 'No gclid, gbraid, or wbraid stored on lead',
    };
  }

  const accessToken = await googleAds.getAccessToken(config);
  const conversion = {
    conversionAction: `customers/${config.customerId}/conversionActions/${config.conversionActionId}`,
    conversionDateTime: formatGoogleDateTime(lead.google_click_at || lead.created_at || Date.now()),
    conversionValue: Number(value),
    currencyCode: config.currencyCode,
    orderId: `crm-convert-${lead.id}`,
    [clickId.field]: clickId.value,
  };

  const res = await fetch(`https://googleads.googleapis.com/${googleAds.GOOGLE_ADS_API_VERSION}/customers/${config.customerId}:uploadClickConversions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': config.developerToken,
      'Content-Type': 'application/json',
      ...(config.loginCustomerId ? { 'login-customer-id': config.loginCustomerId } : {}),
    },
    body: JSON.stringify({
      conversions: [conversion],
      partialFailure: true,
      validateOnly: false,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Google Ads upload failed');
    err.statusCode = 502;
    err.payload = data;
    throw err;
  }

  const partialFailureMessage = data?.partialFailureError?.message || '';
  const uploaded = Array.isArray(data?.results) && data.results.length > 0 && !partialFailureMessage;

  return {
    skipped: false,
    status: uploaded ? 'uploaded' : 'error',
    uploaded,
    clickIdField: clickId.field,
    response: data,
    reason: uploaded ? `Uploaded Google conversion for ${contentName || 'Service'}` : (partialFailureMessage || 'Google Ads did not confirm upload'),
  };
}

module.exports = {
  uploadGoogleConversion,
};
