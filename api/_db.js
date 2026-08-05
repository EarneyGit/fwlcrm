const { Pool } = require('pg');

function getRuntimeDatabaseUrl() {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) return raw;

  try {
    const url = new URL(raw);
    const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase();
    if (sslmode && ['prefer', 'require', 'verify-ca'].includes(sslmode) && !url.searchParams.has('uselibpqcompat')) {
      url.searchParams.set('uselibpqcompat', 'true');
    }
    return url.toString();
  } catch (_) {
    return raw;
  }
}

const pool = new Pool({
  connectionString: getRuntimeDatabaseUrl(),
  ssl: { rejectUnauthorized: false }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
