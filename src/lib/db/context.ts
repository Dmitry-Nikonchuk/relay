import { getRequestContext } from '@cloudflare/next-on-pages';

export function getEnv() {
  const { env } = getRequestContext();
  return env;
}

export function getDb(): D1Database {
  return getEnv().DB;
}
