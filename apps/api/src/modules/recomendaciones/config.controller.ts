import type { Request, Response } from 'express';
import type { ActualizarConfigRequest } from '@tutorias/contracts/recomendaciones';
import { currentUser } from '../../platform/auth';
import { sendCreated, sendOk } from '../../platform/http';
import type { ConfigService } from './config.service';

export function createConfigController(service: ConfigService) {
  return {
    async obtener(_req: Request, res: Response) {
      sendOk(res, await service.obtenerVigente());
    },

    async actualizar(req: Request<unknown, unknown, ActualizarConfigRequest>, res: Response) {
      sendCreated(res, await service.crearVersion(req.body, currentUser(req).id));
    },
  };
}
