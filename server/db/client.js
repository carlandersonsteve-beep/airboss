import { Pool } from 'pg';
import { env } from '../lib/env.js';
import { AppError } from '../lib/errors.js';

let pool = null;

export function getPool() {
  if (!env.databaseUrl) {
    throw new AppError('DATABASE_URL is not configured', 503, {
      hint: 'Set DATABASE_URL to enable shared AirBoss persistence.',
    });
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseUrl.includes('localhost') || env.databaseUrl.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
