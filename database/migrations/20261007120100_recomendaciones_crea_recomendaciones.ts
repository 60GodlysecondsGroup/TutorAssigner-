import type { Knex } from 'knex';
import { addUpdatedAtTrigger, timestamps, uuidPrimaryKey } from '../helpers';

// Recomendaciones (Dev 4): cada cálculo del motor con el snapshot exacto de su entrada.
//
// Las FK hacia `solicitudes(id)` y `tutores(id)` (tablas de Dev 3 y Dev 2) se agregan en H3 con
// una migración posterior a las de esos módulos (`*_recomendaciones_agrega_fk_externas`): hoy esas
// tablas aún no existen y una migración mergeada no se edita.

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recomendaciones', (t) => {
    uuidPrimaryKey(knex, t);
    t.uuid('solicitud_id').notNullable();
    t.uuid('config_id').notNullable().references('id').inTable('matching_config');
    t.text('resultado').notNullable();
    t.uuid('tutor_recomendado_id');
    t.decimal('score', 5, 2);
    t.text('justificacion').notNullable();
    t.jsonb('entrada_snapshot').notNullable();
    t.uuid('generada_por').references('id').inTable('usuarios');
    timestamps(knex, t);
  });
  await knex.raw(`
    ALTER TABLE recomendaciones
      ADD CONSTRAINT ck_recomendaciones_resultado CHECK (resultado IN ('RECOMENDADO','SIN_CANDIDATOS')),
      ADD CONSTRAINT ck_recomendaciones_score CHECK (score BETWEEN 0 AND 100),
      ADD CONSTRAINT ck_recomendaciones_recomendado
        CHECK ((resultado = 'RECOMENDADO') = (tutor_recomendado_id IS NOT NULL))
  `);
  await knex.raw(
    'CREATE INDEX ix_recomendaciones_solicitud ON recomendaciones (solicitud_id, created_at DESC)',
  );
  await addUpdatedAtTrigger(knex, 'recomendaciones');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('recomendaciones');
}
