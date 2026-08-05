require('dotenv').config();

function isProductionLike() {
  const values = [process.env.NODE_ENV, process.env.VERCEL_ENV]
    .filter(Boolean)
    .map(v => String(v).toLowerCase());
  return values.includes('production') || values.includes('prod');
}

function assertSafeDestructiveRun(scriptName) {
  if (process.env.ALLOW_DESTRUCTIVE_DB_SCRIPTS !== 'true') {
    throw new Error(`${scriptName}: refusing to run because ALLOW_DESTRUCTIVE_DB_SCRIPTS=true was not set`);
  }

  if (isProductionLike() && process.env.CONFIRM_PRODUCTION_DESTRUCTIVE !== 'I_UNDERSTAND') {
    throw new Error(`${scriptName}: refusing to run in production-like environment without CONFIRM_PRODUCTION_DESTRUCTIVE=I_UNDERSTAND`);
  }

  if (process.env.DATABASE_URL && /prod|production/i.test(process.env.DATABASE_URL) && process.env.CONFIRM_DB_TARGET !== 'YES') {
    throw new Error(`${scriptName}: DATABASE_URL looks production-like; set CONFIRM_DB_TARGET=YES only if you really intend this`);
  }
}

module.exports = {
  assertSafeDestructiveRun,
};
