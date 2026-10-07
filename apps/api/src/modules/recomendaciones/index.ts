/**
 * Módulo Recomendaciones, Asignaciones y Configuración (Dev 4) — única puerta de entrada.
 * Prefijos propios: `/recomendaciones`, `/asignaciones`, `/matching`.
 * Tablas propias: `matching_config`, `recomendaciones`, `recomendacion_candidatos`, `asignaciones`.
 *
 * Depende solo de la API pública de Tutores y Solicitudes, traducida a sus puertos por los
 * adaptadores. Mientras esos módulos sean stubs, las rutas que los necesitan responden 501.
 */
import type { Db } from '../../platform/db';
import {
  createSolicitudesAdapter,
  type SolicitudesApiPublica,
} from './adapters/solicitudes.adapter';
import { createTutoresAdapter, type TutoresApiPublica } from './adapters/tutores.adapter';
import { createRecomendacionesCore } from './core';

export function createRecomendacionesModule(deps: {
  db: Db;
  tutores: TutoresApiPublica;
  solicitudes: SolicitudesApiPublica;
}) {
  const { router } = createRecomendacionesCore({
    db: deps.db,
    tutores: createTutoresAdapter(deps.tutores),
    solicitudes: createSolicitudesAdapter(deps.solicitudes),
  });
  return { router };
}

export type RecomendacionesModule = ReturnType<typeof createRecomendacionesModule>;
