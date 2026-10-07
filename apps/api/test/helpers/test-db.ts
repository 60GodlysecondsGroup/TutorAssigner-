import { createDb, type Db } from '../../src/platform/db';
import { testDatabaseUrl } from './env';

let shared: Db | undefined;

/** Conexión compartida a la BD de test (una por archivo de test). Ciérrala con `closeTestDb()`. */
export function getTestDb(): Db {
  shared ??= createDb(testDatabaseUrl());
  return shared;
}

export async function closeTestDb() {
  await shared?.destroy();
  shared = undefined;
}

/**
 * Vacía las tablas indicadas. Cada módulo limpia SOLO sus tablas; `usuarios` no se trunca porque
 * otras tablas la referencian (auditoría) y el usuario de test se reutiliza.
 */
export async function truncate(db: Db, ...tables: string[]) {
  if (tables.length === 0) return;
  await db.raw(`TRUNCATE ${tables.map(() => '??').join(', ')} RESTART IDENTITY CASCADE`, tables);
}
