export const env = {
  port: Number(process.env.PORT || 8787),
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || 'airboss-dev-session-secret-change-me',
};
