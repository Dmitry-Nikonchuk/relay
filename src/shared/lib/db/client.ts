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

/** Атомарное выполнение нескольких запросов (D1 не поддерживает SQL `BEGIN`/`COMMIT`). */
export async function batchExecute(
  statements: Array<{ query: string; params: unknown[] }>,
  db?: D1Database,
) {
  const database = resolveDb(db);
  const stmts = statements.map(({ query, params }) => database.prepare(query).bind(...params));
  return database.batch(stmts);
}
