const PROD_ENVS = new Set(['production', 'prod']);

function isProd() {
  return PROD_ENVS.has(String(process.env.NODE_ENV || '').toLowerCase())
    || PROD_ENVS.has(String(process.env.VERCEL_ENV || '').toLowerCase());
}

function hasEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '';
}

function getEnv(name, fallback = '') {
  if (hasEnv(name)) return process.env[name].trim();
  return fallback;
}

function getEnvOrDevFallback(name, devFallback = '') {
  if (hasEnv(name)) return process.env[name].trim();
  if (!isProd()) return devFallback;
  return '';
}

function requireEnv(name, opts = {}) {
  const value = getEnv(name, opts.fallback || '');
  if (value) return value;
  const err = new Error(`Missing required env: ${name}`);
  err.code = 'MISSING_ENV';
  throw err;
}

function requireEnvInProd(name, devFallback = '') {
  if (hasEnv(name)) return process.env[name].trim();
  if (!isProd()) return devFallback;
  const err = new Error(`Missing required env in production: ${name}`);
  err.code = 'MISSING_ENV';
  throw err;
}

function maskSecret(value) {
  if (!value) return 'missing';
  const v = String(value);
  if (v.length <= 8) return '*'.repeat(v.length);
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

module.exports = {
  isProd,
  hasEnv,
  getEnv,
  getEnvOrDevFallback,
  requireEnv,
  requireEnvInProd,
  maskSecret,
};
