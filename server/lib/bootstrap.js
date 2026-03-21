import { getBootstrapData } from '../db/repositories.js';

export async function bootstrapPayload() {
  const data = await getBootstrapData();
  return {
    ok: true,
    mode: 'postgres',
    version: 1,
    ...data,
  };
}
