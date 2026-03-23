// backend/src/config.js
// Central config validation — fail fast if required vars missing in production

const isProd = process.env.NODE_ENV === 'production';

function requireEnv(name) {
  const val = process.env[name];
  if (!val || (typeof val === 'string' && !val.trim())) {
    if (isProd) {
      console.error(`❌ Missing required env: ${name}`);
      process.exit(1);
    }
    return null;
  }
  return val;
}

const SESSION_SECRET = requireEnv('SESSION_SECRET') || (isProd ? null : 'dev-secret-not-for-production');

function getCorsOrigin() {
  const origins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL;
  if (origins) return origins.split(',').map((o) => o.trim()).filter(Boolean);
  if (isProd) {
    console.error('❌ In production, set CORS_ORIGINS or FRONTEND_URL for allowed origins');
    process.exit(1);
  }
  return true;
}

module.exports = {
  SESSION_SECRET,
  isProd,
  getCorsOrigin,
};
