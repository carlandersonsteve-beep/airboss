import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const result = await client.query('select now() as now, current_database() as db');
  const row = result.rows[0] || {};
  console.log(JSON.stringify({ ok: true, now: row.now, db: row.db }));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    name: error?.name,
    message: error?.message,
    code: error?.code,
    severity: error?.severity,
  }));
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
