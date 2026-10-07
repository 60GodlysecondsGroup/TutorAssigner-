import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Carga el `.env` de la raíz si existe (ejecución en el host). En Docker las variables ya vienen dadas. */
export function loadRootEnv() {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.env');
  if (existsSync(file)) process.loadEnvFile(file);
}

export function testDatabaseUrl(): string {
  loadRootEnv();
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      'DATABASE_URL_TEST no está definida. Corre los tests dentro de Docker ' +
        '(docker compose exec api npm test -w apps/api) o define la variable apuntando a una BD de test.',
    );
  }
  return url;
}
