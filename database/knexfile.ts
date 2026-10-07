/**
 * Configuración de Knex compartida por el runner de migraciones, los seeds y el API.
 * Dueño: Dev 1. Las migraciones viven en `migrations/` con el formato
 * `AAAAMMDDHHMMSS_<modulo>_<cambio>.ts`; cada archivo pertenece al dueño de su módulo.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Knex } from 'knex';

const here = path.dirname(fileURLToPath(import.meta.url));

export const MIGRATIONS_DIR = path.join(here, 'migrations');
export const SEEDS_DIR = path.join(here, 'seeds');
export const MIGRATION_STUB = path.join(here, 'scripts', 'migration.stub');

/** Los seeds cuyo nombre empieza por un número ≥ 10 son de demo y solo corren con SEED_DEMO=true. */
export const isDemoSeed = (file: string) => Number.parseInt(path.basename(file), 10) >= 10;

export function knexConfig(connectionString: string): Knex.Config {
  return {
    client: 'pg',
    connection: connectionString,
    pool: { min: 0, max: 10 },
    migrations: {
      directory: MIGRATIONS_DIR,
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
      stub: MIGRATION_STUB,
    },
    seeds: {
      directory: SEEDS_DIR,
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
  };
}

/** Export por defecto para quien use la CLI de Knex directamente. */
export default knexConfig(process.env.DATABASE_URL ?? '');
