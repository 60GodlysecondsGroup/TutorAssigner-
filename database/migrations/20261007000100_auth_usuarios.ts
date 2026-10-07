import type { Knex } from 'knex';
import { addUpdatedAtTrigger, timestamps, uuidPrimaryKey } from '../helpers';

// Auth (Dev 1): tabla `usuarios` según la sección 7 del plan.

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('usuarios', (t) => {
    uuidPrimaryKey(knex, t);
    t.text('email').notNullable();
    t.text('nombre').notNullable();
    t.text('password_hash').notNullable();
    t.text('rol').notNullable();
    t.boolean('activo').notNullable().defaultTo(true);
    timestamps(knex, t);
  });
  // Estados y roles como text + CHECK (no ENUM): ampliarlos es una migración simple (PV-02).
  await knex.raw(
    "ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_rol CHECK (rol IN ('COORDINADOR'))",
  );
  await knex.raw('CREATE UNIQUE INDEX ux_usuarios_email ON usuarios (lower(email))');
  await addUpdatedAtTrigger(knex, 'usuarios');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('usuarios');
}
