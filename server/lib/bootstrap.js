import { env } from './env.js';
import { getBootstrapData } from '../db/repositories.js';

export async function bootstrapPayload() {
  const data = await getBootstrapData();
  return {
    ok: true,
    mode: env.databaseUrl ? 'postgres' : 'local',
    version: 1,
    ...data,
  };
}
