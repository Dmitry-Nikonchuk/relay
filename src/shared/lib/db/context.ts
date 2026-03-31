import { getCloudflareContext } from '@opennextjs/cloudflare';

export function getEnv() {
  const { env } = getCloudflareContext();
  return env;
}

export function getDb(): D1Database {
  return getEnv().DB;
}
