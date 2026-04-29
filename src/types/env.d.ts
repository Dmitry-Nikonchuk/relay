import type { D1Database } from '@cloudflare/workers-types';

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    CHAT_DATA_MASTER_KEY: string;
  }
}

export {};
