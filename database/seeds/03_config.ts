import type { Knex } from 'knex';

// Seed base (Dev 4, todos los entornos): matching_config versión 1, vigente, con los pesos v1 de la
// sección 10 del plan (los mismos que `configV1` en @tutorias/contracts/matching/fixtures).
// Idempotente: si ya existe alguna versión no hace nada (no pisa cambios hechos desde la UI).

const PESOS_V1 = { dominio: 0.3, horario: 0.25, prioridad: 0.2, preferencias: 0.15, carga: 0.1 };
const PARAMETROS_V1 = { topN: 3, bloquesHorarioIdeal: 3 };

export async function seed(knex: Knex): Promise<void> {
  const existente = await knex('matching_config').first('id');
  if (existente) return;

  await knex('matching_config').insert({
    version: 1,
    pesos: JSON.stringify(PESOS_V1),
    parametros: JSON.stringify(PARAMETROS_V1),
    vigente: true,
  });
  console.info('[seed 03_config] matching_config v1 creada como vigente');
}
