/**
 * Setup global de los tests de integración: aplica todas las migraciones a la BD de test.
 * Usa la misma CLI que el job `migrate` (con tsx en un subproceso): Knex importa las migraciones
 * con el loader nativo de Node, que dentro de vitest no resuelve TypeScript sin extensión.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { testDatabaseUrl } from './env';

export default function setup() {
  const url = testDatabaseUrl();
  const cli = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../database/scripts/cli.ts',
  );
  execFileSync(process.execPath, ['--import', 'tsx', cli, 'latest', '--test'], {
    env: { ...process.env, DATABASE_URL_TEST: url },
    stdio: 'inherit',
  });
}
