const db = require('./_db');
const { sendCapiEvent, STATUS_EVENT_MAP } = require('./_capi');
const { ensureLeadSchema } = require('./_lead_schema');

function sanitizeName(val) {
  if (!val) return '';
  if (/^<[^>]+>$/.test(String(val).trim())) return '';
  return String(val).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  return v ? v : null;
}

function cleanTimestamp(value) {
  const v = cleanText(value);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeSourcePlatform(value, fallback = 'manual') {
  const v = cleanText(value);
  if (!v) return fallback;
  const normalized = v.toLowerCase();
  if (['meta', 'google', 'manual', 'whatsapp', 'referral', 'phone', 'other'].includes(normalized)) return normalized;
  if (['facebook', 'instagram', 'fb', 'ig'].includes(normalized)) return 'meta';
  return normalized;
}

function deriveSourcePlatform(payload = {}) {
  const explicit = normalizeSourcePlatform(payload.sourcePlatform || payload.source_platform || null, null);
  if (explicit) return explicit;

  if (cleanText(payload.gclid) || cleanText(payload.gbraid) || cleanText(payload.wbraid) ||
      cleanText(payload.googleCampaignId || payload.google_campaign_id) || cleanText(payload.googleAdId || payload.google_ad_id)) {
    return 'google';
  }

  const source = cleanText(payload.source);
  if (source === 'whatsapp') return 'whatsapp';
  if (source === 'facebook' || source === 'instagram') return 'meta';
  if (source === 'referral') return 'referral';
  if (source === 'phone') return 'phone';
  return 'manual';
}

function buildGoogleAttribution(payload = {}) {
  const attrs = {
    source_platform: deriveSourcePlatform(payload),
    gclid: cleanText(payload.gclid),
    gbraid: cleanText(payload.gbraid),
    wbraid: cleanText(payload.wbraid),
    google_campaign_id: cleanText(payload.googleCampaignId || payload.google_campaign_id),
    google_campaign_name: cleanText(payload.googleCampaignName || payload.google_campaign_name),
    google_ad_group_id: cleanText(payload.googleAdGroupId || payload.google_ad_group_id),
    google_ad_group_name: cleanText(payload.googleAdGroupName || payload.google_ad_group_name),
    google_ad_id: cleanText(payload.googleAdId || payload.google_ad_id),
    google_ad_name: cleanText(payload.googleAdName || payload.google_ad_name),
    google_click_at: cleanTimestamp(payload.googleClickAt || payload.google_click_at),
    google_conversion_uploaded_at: cleanTimestamp(payload.googleConversionUploadedAt || payload.google_conversion_uploaded_at),
    google_conversion_status: cleanText(payload.googleConversionStatus || payload.google_conversion_status),
    google_conversion_error: cleanText(payload.googleConversionError || payload.google_conversion_error),
  };

  if (attrs.source_platform !== 'google') {
    attrs.gclid = attrs.gclid || null;
    attrs.gbraid = attrs.gbraid || null;
    attrs.wbraid = attrs.wbraid || null;
    attrs.google_campaign_id = attrs.google_campaign_id || null;
    attrs.google_campaign_name = attrs.google_campaign_name || null;
    attrs.google_ad_group_id = attrs.google_ad_group_id || null;
    attrs.google_ad_group_name = attrs.google_ad_group_name || null;
    attrs.google_ad_id = attrs.google_ad_id || null;
    attrs.google_ad_name = attrs.google_ad_name || null;
    attrs.google_click_at = attrs.google_click_at || null;
  }

  return attrs;
}

function mapLeadRow(r) {
  const rawFirst = r.first_name || '';
  const rawLast  = r.last_name  || '';
  const rawName  = r.name       || '';

  const cleanFirst = sanitizeName(rawFirst);
  const cleanLast  = sanitizeName(rawLast);
  const cleanName  = sanitizeName(rawName) || cleanFirst || 'Test Lead';

  const initials = cleanFirst && cleanLast
    ? (cleanFirst[0] + cleanLast[0]).toUpperCase()
    : cleanFirst
      ? cleanFirst[0].toUpperCase()
      : cleanName[0]?.toUpperCase() || 'TL';

  return {
    id: r.id,
    leadgenId: r.leadgen_id,
    name: cleanName,
    firstName: cleanFirst,
    lastName: cleanLast,
    phone: sanitizeName(r.phone),
    email: sanitizeName(r.email),
    city: r.city,
    status: r.status,
    source: r.source,
    sourcePlatform: r.source_platform || deriveSourcePlatform(r),
    clientId: r.client_id,
    clientName: r.client_name,
    campaign: r.campaign,
    adId: r.ad_id,
    avatarColor: r.avatar_color || '#6C47FF',
    fieldData: r.field_data,
    activities: r.activities || [],
    assignedTo: r.assigned_to,
    createdAt: r.created_at,
    slaBreached: r.sla_breached,
    convertedAt: r.converted_at,
    conversionValue: r.conversion_value,
    gclid: r.gclid,
    gbraid: r.gbraid,
    wbraid: r.wbraid,
    googleCampaignId: r.google_campaign_id,
    googleCampaignName: r.google_campaign_name,
    googleAdGroupId: r.google_ad_group_id,
    googleAdGroupName: r.google_ad_group_name,
    googleAdId: r.google_ad_id,
    googleAdName: r.google_ad_name,
    googleClickAt: r.google_click_at,
    googleConversionUploadedAt: r.google_conversion_uploaded_at,
    googleConversionStatus: r.google_conversion_status,
    googleConversionError: r.google_conversion_error,
    initials
  };
}

export default async function handler(req, res) {
  await ensureLeadSchema();
  if (req.method === 'GET') {
    try {
      const query = `
        SELECT 
          l.*, 
          c.name as client_name, 
          c.color as avatar_color,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', a.id,
              'type', a.type,
              'text', a.text,
              'user', a.user_name,
              'ts', a.ts
            ) ORDER BY a.ts DESC) 
            FROM activities a WHERE a.lead_id = l.id),
            '[]'::json
          ) as activities
        FROM leads l
        LEFT JOIN clients c ON l.client_id = c.id
        ORDER BY l.created_at DESC
        LIMIT 100
      `;
      const { rows } = await db.query(query);
      res.status(200).json(rows.map(mapLeadRow));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, phone, email, clientId, source, adId, campaign } = req.body;
      const leadSource = ['whatsapp', 'manual', 'referral', 'phone', 'facebook', 'instagram'].includes(source) ? source : 'manual';
      const campaignLabel = campaign || (leadSource === 'whatsapp' ? 'Business WhatsApp (manual)' : 'Manual Entry');
      const google = buildGoogleAttribution(req.body);

      const [first, ...rest] = String(name || '').trim().split(' ');
      const last = rest.join(' ') || 'Lead';

      const insertQuery = `
        INSERT INTO leads (
          id, leadgen_id, name, first_name, last_name, phone, email, status, source, client_id, campaign, ad_id, created_at,
          source_platform, gclid, gbraid, wbraid, google_campaign_id, google_campaign_name,
          google_ad_group_id, google_ad_group_name, google_ad_id, google_ad_name, google_click_at,
          google_conversion_uploaded_at, google_conversion_status, google_conversion_error
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'new', $9, $8, $10, $11, NOW(),
          $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25
        )
        RETURNING *
      `;

      const id = 'l_manual_' + Date.now();
      const leadgenId = 'manual_' + Date.now();

      const params = [
        id, leadgenId, name, first, last, phone, email, clientId, leadSource, campaignLabel, adId || '',
        google.source_platform, google.gclid, google.gbraid, google.wbraid, google.google_campaign_id, google.google_campaign_name,
        google.google_ad_group_id, google.google_ad_group_name, google.google_ad_id, google.google_ad_name, google.google_click_at,
        google.google_conversion_uploaded_at, google.google_conversion_status, google.google_conversion_error
      ];

      const { rows } = await db.query(insertQuery, params);

      if (google.source_platform !== 'google') {
        sendCapiEvent('Lead', rows[0]).catch(() => null);
      }

      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { id, status, assigned_to } = req.body;
      const updates = [];
      const values = [];
      let i = 1;

      const pushUpdate = (column, value) => {
        updates.push(`${column} = $${i++}`);
        values.push(value);
      };

      if (status) pushUpdate('status', status);
      if (assigned_to !== undefined) pushUpdate('assigned_to', assigned_to);
      if (req.body.source !== undefined) pushUpdate('source', cleanText(req.body.source));
      if (req.body.campaign !== undefined) pushUpdate('campaign', cleanText(req.body.campaign));
      if (req.body.adId !== undefined || req.body.ad_id !== undefined) pushUpdate('ad_id', cleanText(req.body.adId || req.body.ad_id));

      const google = buildGoogleAttribution(req.body);
      const googleFieldPresent = [
        'sourcePlatform','source_platform','gclid','gbraid','wbraid','googleCampaignId','google_campaign_id','googleCampaignName','google_campaign_name',
        'googleAdGroupId','google_ad_group_id','googleAdGroupName','google_ad_group_name','googleAdId','google_ad_id','googleAdName','google_ad_name',
        'googleClickAt','google_click_at','googleConversionUploadedAt','google_conversion_uploaded_at','googleConversionStatus','google_conversion_status',
        'googleConversionError','google_conversion_error'
      ].some(key => Object.prototype.hasOwnProperty.call(req.body, key));

      if (googleFieldPresent) {
        pushUpdate('source_platform', google.source_platform);
        pushUpdate('gclid', google.gclid);
        pushUpdate('gbraid', google.gbraid);
        pushUpdate('wbraid', google.wbraid);
        pushUpdate('google_campaign_id', google.google_campaign_id);
        pushUpdate('google_campaign_name', google.google_campaign_name);
        pushUpdate('google_ad_group_id', google.google_ad_group_id);
        pushUpdate('google_ad_group_name', google.google_ad_group_name);
        pushUpdate('google_ad_id', google.google_ad_id);
        pushUpdate('google_ad_name', google.google_ad_name);
        pushUpdate('google_click_at', google.google_click_at);
        pushUpdate('google_conversion_uploaded_at', google.google_conversion_uploaded_at);
        pushUpdate('google_conversion_status', google.google_conversion_status);
        pushUpdate('google_conversion_error', google.google_conversion_error);
      }

      if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

      values.push(id);
      let prevStatus = null;
      if (status) {
        const prev = await db.query('SELECT status FROM leads WHERE id = $1', [id]);
        prevStatus = prev.rows[0] ? prev.rows[0].status : null;
      }
      const query = `UPDATE leads SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
      const { rows } = await db.query(query, values);

      if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

      if (status && prevStatus !== status) {
        db.query(
          'INSERT INTO lead_stage_history (lead_id, from_status, to_status, changed_by) VALUES ($1,$2,$3,$4)',
          [id, prevStatus, status, 'CRM']
        ).catch(() => null);
      }

      if (status && STATUS_EVENT_MAP[status] && deriveSourcePlatform(rows[0]) !== 'google') {
        const lead = rows[0];
        const capiExtra = (status === 'won' || status === 'converted')
          ? { currency: 'INR', value: lead.cpl || '0' }
          : {};
        sendCapiEvent(STATUS_EVENT_MAP[status], lead, capiExtra).catch(() => null);
      }

      res.status(200).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
