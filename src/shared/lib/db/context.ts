import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

export function getEnv() {
  const { env } = getCloudflareContext();
  return env;
}

export function getDb(): D1Database {
  return getEnv().DB;
}
