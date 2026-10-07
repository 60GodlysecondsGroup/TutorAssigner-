/**
 * Acceso a PostgreSQL con Knex. Cada módulo recibe `db` por inyección y solo toca sus tablas
 * desde su repositorio. Las transacciones se abren en el servicio (caso de uso).
 */
import knexFactory, { type Knex } from 'knex';
import { knexConfig } from '@tutorias/database/knexfile';
import type { Logger } from './logger';

export type Db = Knex;
export type Trx = Knex.Transaction;
/** Lo que acepta un repositorio: la conexión o una transacción en curso. */
export type DbOrTrx = Knex | Knex.Transaction;

/** Crea el pool. Con `logger`, los avisos internos de Knex salen como logs JSON estructurados. */
export function createDb(databaseUrl: string, logger?: Logger): Db {
  return knexFactory({
    ...knexConfig(databaseUrl),
    ...(logger && {
      log: {
        warn: (message: unknown) => logger.warn({ knex: message }, 'knex'),
        error: (message: unknown) => logger.error({ knex: message }, 'knex'),
        deprecate: (method: string, alternative: string) =>
          logger.warn({ method, alternative }, 'knex: método obsoleto'),
        debug: (message: unknown) => logger.debug({ knex: message }, 'knex'),
      },
    }),
  });
}

/** Ejecuta `fn` en una transacción: commit si resuelve, rollback si lanza. */
export function withTransaction<T>(db: Db, fn: (trx: Trx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}

/** Comprueba la conexión (readiness). */
export async function pingDb(db: Db): Promise<boolean> {
  try {
    await db.raw('select 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Pagina una consulta: devuelve las filas de la página y el total sin paginar.
 * La consulta debe traer su propio `orderBy` para que el orden sea estable.
 */
export async function paginate<Row>(
  query: Knex.QueryBuilder,
  { page, pageSize }: { page: number; pageSize: number },
): Promise<{ rows: Row[]; total: number }> {
  const countQuery = query
    .clone()
    .clearSelect()
    .clearOrder()
    .count<{ total: string }[]>({ total: '*' });
  const [countRows, rows] = await Promise.all([
    countQuery,
    query
      .clone()
      .limit(pageSize)
      .offset((page - 1) * pageSize) as Promise<Row[]>,
  ]);
  return { rows, total: Number(countRows[0]?.total ?? 0) };
}
