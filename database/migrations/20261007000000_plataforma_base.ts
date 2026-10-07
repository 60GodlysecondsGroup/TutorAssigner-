import type { Knex } from 'knex';

// Plataforma (Dev 1): función común para mantener `updated_at`. La usan todos los módulos
// mediante `addUpdatedAtTrigger()` de `database/helpers.ts`.
// `gen_random_uuid()` es nativo desde PostgreSQL 13: no requiere extensiones.

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION IF EXISTS set_updated_at()');
}
