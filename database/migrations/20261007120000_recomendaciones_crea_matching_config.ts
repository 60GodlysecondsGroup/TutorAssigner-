import type { Knex } from 'knex';
import { addUpdatedAtTrigger, timestamps, uuidPrimaryKey } from '../helpers';

// Recomendaciones (Dev 4): pesos y parámetros del motor, versionados. Solo una versión vigente.

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('matching_config', (t) => {
    uuidPrimaryKey(knex, t);
    t.integer('version').notNullable().unique();
    t.jsonb('pesos').notNullable();
    t.jsonb('parametros').notNullable();
    t.boolean('vigente').notNullable().defaultTo(false);
    t.uuid('creada_por').references('id').inTable('usuarios');
    timestamps(knex, t);
  });
  await knex.raw(
    'ALTER TABLE matching_config ADD CONSTRAINT ck_matching_config_version CHECK (version > 0)',
  );
  await knex.raw(
    'CREATE UNIQUE INDEX ux_matching_config_vigente ON matching_config (vigente) WHERE vigente',
  );
  await addUpdatedAtTrigger(knex, 'matching_config');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('matching_config');
}
