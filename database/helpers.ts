/**
 * Helpers para migraciones (Dev 1). Aplican las convenciones de la sección 7 del plan:
 * `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at` y `updated_at timestamptz`.
 */
import type { Knex } from 'knex';

/** Columna `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`. */
export function uuidPrimaryKey(knex: Knex, t: Knex.CreateTableBuilder) {
  t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
}

/** Columnas `created_at` y `updated_at timestamptz NOT NULL DEFAULT now()`. */
export function timestamps(knex: Knex, t: Knex.CreateTableBuilder) {
  t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

/**
 * Mantiene `updated_at` en cada UPDATE con la función `set_updated_at()`
 * creada por la migración de plataforma.
 */
export async function addUpdatedAtTrigger(knex: Knex, table: string) {
  await knex.raw(
    `CREATE TRIGGER trg_${table}_updated_at BEFORE UPDATE ON ?? FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    [table],
  );
}
