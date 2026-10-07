import type { Knex } from 'knex';
import { addUpdatedAtTrigger, timestamps, uuidPrimaryKey } from '../helpers';

// Recomendaciones (Dev 4): decisiones confirmadas por el coordinador.
// Una sola asignación ACTIVA por solicitud (índice único parcial: la segunda confirmación → 409).
// Las FK hacia `solicitudes(id)` y `tutores(id)` llegan en H3 (ver migración de `recomendaciones`).

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('asignaciones', (t) => {
    uuidPrimaryKey(knex, t);
    t.uuid('solicitud_id').notNullable();
    t.uuid('tutor_id').notNullable();
    t.uuid('recomendacion_id').references('id').inTable('recomendaciones');
    t.text('motivo_cambio');
    t.text('estado').notNullable().defaultTo('ACTIVA');
    t.uuid('creada_por').references('id').inTable('usuarios');
    timestamps(knex, t);
  });
  await knex.raw(
    "ALTER TABLE asignaciones ADD CONSTRAINT ck_asignaciones_estado CHECK (estado IN ('ACTIVA','FINALIZADA','CANCELADA'))",
  );
  await knex.raw(
    "CREATE UNIQUE INDEX ux_asignacion_activa_solicitud ON asignaciones (solicitud_id) WHERE estado = 'ACTIVA'",
  );
  await knex.raw(
    "CREATE INDEX ix_asignaciones_tutor_activas ON asignaciones (tutor_id) WHERE estado = 'ACTIVA'",
  );
  // Listado de /asignaciones filtrado por estado y ordenado por fecha.
  await knex.raw(
    'CREATE INDEX ix_asignaciones_estado_fecha ON asignaciones (estado, created_at DESC)',
  );
  await addUpdatedAtTrigger(knex, 'asignaciones');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('asignaciones');
}
