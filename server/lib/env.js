const defaultSessionSecret = 'groundcore-dev-session-secret-change-me';
const explicitHost = process.env.HOST || '';
const allowedOriginsRaw = process.env.ALLOWED_ORIGINS || '';
const databaseSslModeRaw = process.env.DATABASE_SSL_MODE || '';
const databaseSslCa = process.env.DATABASE_SSL_CA || '';
const trustProxyRaw = process.env.TRUST_PROXY || '';

const host = explicitHost || '127.0.0.1';
const secureCookieOverride = process.env.SECURE_COOKIES || '';
const inferSecureCookies = () => {
  if (secureCookieOverride) {
    return ['1', 'true', 'yes', 'on'].includes(secureCookieOverride.trim().toLowerCase());
  }
  return Boolean(process.env.DATABASE_URL) && host !== '127.0.0.1' && host !== 'localhost';
};

export const env = {
  port: Number(process.env.PORT || 8787),
  host,
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || defaultSessionSecret,
  checkinSecret: process.env.CHECKIN_SECRET || process.env.SESSION_SECRET || defaultSessionSecret,
  allowedOrigins: allowedOriginsRaw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  databaseSslMode: databaseSslModeRaw.trim().toLowerCase() || 'verify-full',
  databaseSslCa: databaseSslCa,
  isSecureCookieEnvironment: inferSecureCookies(),
  trustProxy: ['1', 'true', 'yes', 'on'].includes(trustProxyRaw.trim().toLowerCase()),
  loginRateLimitWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000),
  loginRateLimitMaxAttempts: Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5),
  loginRateLimitBlockMs: Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MS || 15 * 60 * 1000),
};

if (env.databaseUrl && env.sessionSecret === defaultSessionSecret) {
  throw new Error('SESSION_SECRET must be set to a unique value when DATABASE_URL is configured');
}

if (env.databaseUrl && !explicitHost) {
  console.warn('HOST not explicitly set; defaulting to 127.0.0.1 for safety. Set HOST deliberately in hosted deployments.');
}
