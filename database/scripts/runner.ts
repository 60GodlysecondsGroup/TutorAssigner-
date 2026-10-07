/**
 * Runner programático de migraciones y seeds. Lo usan la CLI (`cli.ts`), el job `migrate`
 * de Docker y el setup global de los tests de integración del API.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import knexFactory, { type Knex } from 'knex';
import { SEEDS_DIR, isDemoSeed, knexConfig } from '../knexfile';

export function createKnex(connectionString: string): Knex {
  if (!connectionString) throw new Error('Falta la cadena de conexión (DATABASE_URL)');
  return knexFactory(knexConfig(connectionString));
}

export async function migrateLatest(db: Knex): Promise<string[]> {
  const [, applied] = (await db.migrate.latest()) as [number, string[]];
  return applied;
}

export async function rollbackAll(db: Knex): Promise<string[]> {
  const [, reverted] = (await db.migrate.rollback(undefined, true)) as [number, string[]];
  return reverted;
}

/**
 * Corre los seeds en orden de nombre. Los de demo (`10_*` en adelante) solo si `demo` es true.
 * Cada seed debe ser idempotente: el job `migrate` los ejecuta en cada `docker compose up`.
 */
export async function runSeeds(db: Knex, { demo }: { demo: boolean }): Promise<string[]> {
  const files = (await readdir(SEEDS_DIR))
    .filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith('.d.ts'))
    .filter((f) => demo || !isDemoSeed(f))
    .sort();
  for (const file of files) {
    await db.seed.run({ specific: file });
  }
  return files.map((f) => path.parse(f).name);
}
