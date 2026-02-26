import { D1Database } from '@cloudflare/workers-types';
import { getDb } from './context';

function resolveDb(db?: D1Database): D1Database {
  return db ?? getDb();
}

export async function queryOne<T>(
  query: string,
  params: unknown[] = [],
  db?: D1Database,
): Promise<T | null> {
  return resolveDb(db)
    .prepare(query)
    .bind(...params)
    .first<T>();
}

export async function queryAll<T>(
  query: string,
  params: unknown[] = [],
  db?: D1Database,
): Promise<T[]> {
  const res = await resolveDb(db)
    .prepare(query)
    .bind(...params)
    .all<T>();

  return res.results ?? [];
}

export async function execute(query: string, params: unknown[] = [], db?: D1Database) {
  return resolveDb(db)
    .prepare(query)
    .bind(...params)
    .run();
}

export async function transaction<T>(fn: (trx: D1Database) => Promise<T>): Promise<T> {
  const database = resolveDb();

  await database.exec('BEGIN');

  try {
    const result = await fn(database);
    await database.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      await database.exec('ROLLBACK');
    } catch {
      // ignore rollback errors, rethrow original
    }
    throw err;
  }
}
