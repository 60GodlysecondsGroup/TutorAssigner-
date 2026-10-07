/**
 * CLI de base de datos.
 *
 *   tsx scripts/cli.ts latest | rollback | rollback-all | status | seed | setup
 *   tsx scripts/cli.ts make <modulo>_<cambio>
 *
 * Usa DATABASE_URL (o DATABASE_URL_TEST con `--test`). `setup` = migraciones + seeds; es lo que
 * corre el servicio `migrate` de Docker antes de arrancar el API. Los seeds de demo solo corren
 * con SEED_DEMO=true.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createKnex, migrateLatest, rollbackAll, runSeeds } from './runner';

const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const [command, ...rest] = process.argv.slice(2);
const useTest = rest.includes('--test');
const args = rest.filter((a) => a !== '--test');
const url = useTest ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
const demo = process.env.SEED_DEMO === 'true';

const MIGRATION_NAME = /^[a-z0-9]+_[a-z0-9_]+$/;

async function main() {
  if (command === 'make') {
    const name = args[0];
    if (!name || !MIGRATION_NAME.test(name)) {
      throw new Error('Uso: migrate:make <modulo>_<cambio>  (p. ej. tutores_agrega_capacidad)');
    }
    // `make` no se conecta a la base: basta una URL vacía.
    const db = createKnex(url ?? 'postgres://localhost/unused');
    try {
      const file = await db.migrate.make(name);
      console.info(`Migración creada: ${path.relative(process.cwd(), file)}`);
    } finally {
      await db.destroy();
    }
    return;
  }

  const db = createKnex(url ?? '');
  try {
    switch (command) {
      case 'latest':
        report('Migraciones aplicadas', await migrateLatest(db));
        break;
      case 'rollback': {
        const [, reverted] = (await db.migrate.rollback()) as [number, string[]];
        report('Migraciones revertidas', reverted);
        break;
      }
      case 'rollback-all':
        report('Migraciones revertidas', await rollbackAll(db));
        break;
      case 'status': {
        const [done, pending] = (await db.migrate.list()) as [
          { name: string }[],
          { file: string }[],
        ];
        report(
          'Aplicadas',
          done.map((m) => m.name),
        );
        report(
          'Pendientes',
          pending.map((m) => m.file),
        );
        break;
      }
      case 'seed':
        report(`Seeds ejecutados${demo ? ' (con demo)' : ''}`, await runSeeds(db, { demo }));
        break;
      case 'setup':
        report('Migraciones aplicadas', await migrateLatest(db));
        report(`Seeds ejecutados${demo ? ' (con demo)' : ''}`, await runSeeds(db, { demo }));
        break;
      default:
        throw new Error(`Comando desconocido: ${command ?? '(vacío)'}`);
    }
  } finally {
    await db.destroy();
  }
}

function report(title: string, items: string[]) {
  console.info(`${title}: ${items.length === 0 ? 'ninguna' : `\n  - ${items.join('\n  - ')}`}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
