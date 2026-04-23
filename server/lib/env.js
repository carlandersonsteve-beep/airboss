const defaultSessionSecret = 'groundcore-dev-session-secret-change-me';
const defaultHost = process.env.DATABASE_URL ? '0.0.0.0' : '127.0.0.1';

export const env = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || defaultHost,
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || defaultSessionSecret,
  checkinSecret: process.env.CHECKIN_SECRET || process.env.SESSION_SECRET || defaultSessionSecret,
};

if (env.databaseUrl && env.sessionSecret === defaultSessionSecret) {
  throw new Error('SESSION_SECRET must be set to a unique value when DATABASE_URL is configured');
}
