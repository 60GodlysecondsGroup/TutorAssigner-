import type { Router } from 'express';
import { IdParams } from '@tutorias/contracts/common';
import {
  GenerarRecomendacionRequest,
  ListarRecomendacionesQuery,
} from '@tutorias/contracts/recomendaciones';
import { requireRole } from '../../platform/auth';
import { validate } from '../../platform/http';
import type { createRecomendacionesController } from './recomendaciones.controller';

export function registrarRutasRecomendaciones(
  router: Router,
  controller: ReturnType<typeof createRecomendacionesController>,
) {
  const coordinador = requireRole('COORDINADOR');
  router.post(
    '/recomendaciones',
    coordinador,
    validate({ body: GenerarRecomendacionRequest }),
    controller.generar,
  );
  router.get(
    '/recomendaciones',
    coordinador,
    validate({ query: ListarRecomendacionesQuery }),
    controller.listar,
  );
  router.get(
    '/recomendaciones/:id',
    coordinador,
    validate({ params: IdParams }),
    controller.obtener,
  );
}
