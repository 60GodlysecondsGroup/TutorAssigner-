import type { Knex } from 'knex';

// Recomendaciones (Dev 4): ranking completo y desglose por tutor de cada recomendación.
// `desglose` guarda los criterios (valor, peso, aporte, evidencia) o `{ motivos }` si fue descartado.
// La FK hacia `tutores(id)` llega en H3 (ver migración de `recomendaciones`).

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recomendacion_candidatos', (t) => {
    t.uuid('recomendacion_id')
      .notNullable()
      .references('id')
      .inTable('recomendaciones')
      .onDelete('CASCADE');
    t.uuid('tutor_id').notNullable();
    t.boolean('elegible').notNullable();
    t.smallint('posicion');
    t.decimal('score', 5, 2);
    t.jsonb('desglose').notNullable();
    t.primary(['recomendacion_id', 'tutor_id']);
  });
  await knex.raw(`
    ALTER TABLE recomendacion_candidatos
      ADD CONSTRAINT ck_recomendacion_candidatos_posicion
        CHECK ((elegible AND posicion >= 1) OR (NOT elegible AND posicion IS NULL)),
      ADD CONSTRAINT ck_recomendacion_candidatos_score CHECK (score BETWEEN 0 AND 100)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('recomendacion_candidatos');
}
