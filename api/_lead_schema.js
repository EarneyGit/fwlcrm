const db = require('./_db');

let schemaEnsured = false;

const LEAD_SCHEMA_SQL = `
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50) DEFAULT 'manual';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS gclid TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS gbraid TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS wbraid TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_campaign_id TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_campaign_name TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_ad_group_id TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_ad_group_name TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_ad_id TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_ad_name TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_click_at TIMESTAMPTZ;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_conversion_uploaded_at TIMESTAMPTZ;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_conversion_status TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_conversion_error TEXT;
`;

async function ensureLeadSchema() {
  if (schemaEnsured) return;
  await db.query(LEAD_SCHEMA_SQL);
  schemaEnsured = true;
}

module.exports = {
  ensureLeadSchema,
};
