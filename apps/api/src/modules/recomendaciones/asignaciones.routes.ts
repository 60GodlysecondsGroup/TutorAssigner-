import type { Router } from 'express';
import { IdParams } from '@tutorias/contracts/common';
import {
  CambiarEstadoAsignacionRequest,
  ConfirmarAsignacionRequest,
  ListarAsignacionesQuery,
} from '@tutorias/contracts/recomendaciones';
import { requireRole } from '../../platform/auth';
import { validate } from '../../platform/http';
import type { createAsignacionesController } from './asignaciones.controller';

export function registrarRutasAsignaciones(
  router: Router,
  controller: ReturnType<typeof createAsignacionesController>,
) {
  const coordinador = requireRole('COORDINADOR');
  router.post(
    '/asignaciones',
    coordinador,
    validate({ body: ConfirmarAsignacionRequest }),
    controller.confirmar,
  );
  router.get(
    '/asignaciones',
    coordinador,
    validate({ query: ListarAsignacionesQuery }),
    controller.listar,
  );
  router.patch(
    '/asignaciones/:id',
    coordinador,
    validate({ params: IdParams, body: CambiarEstadoAsignacionRequest }),
    controller.cambiarEstado,
  );
}
