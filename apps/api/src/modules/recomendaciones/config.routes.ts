import type { Router } from 'express';
import { ActualizarConfigRequest } from '@tutorias/contracts/recomendaciones';
import { requireRole } from '../../platform/auth';
import { validate } from '../../platform/http';
import type { createConfigController } from './config.controller';

export function registrarRutasConfig(
  router: Router,
  controller: ReturnType<typeof createConfigController>,
) {
  const coordinador = requireRole('COORDINADOR');
  router.get('/matching/config', coordinador, controller.obtener);
  router.put(
    '/matching/config',
    coordinador,
    validate({ body: ActualizarConfigRequest }),
    controller.actualizar,
  );
}
