require('dotenv').config();
const { Pool } = require('pg');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(value).trim();
}

function optionalEnv(name, fallback = '') {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function getScriptDatabaseUrl() {
  const raw = optionalEnv('DATABASE_URL');
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

function createPgPool() {
  return new Pool({
    connectionString: getScriptDatabaseUrl(),
    ssl: { rejectUnauthorized: false }
  });
}

function maskSecret(value) {
  if (!value) return 'missing';
  const v = String(value);
  if (v.length <= 8) return '*'.repeat(v.length);
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

module.exports = {
  requireEnv,
  optionalEnv,
  getScriptDatabaseUrl,
  createPgPool,
  maskSecret,
};
