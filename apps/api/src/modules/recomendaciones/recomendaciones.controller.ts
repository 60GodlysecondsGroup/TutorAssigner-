import type { Request, Response } from 'express';
import type { IdParams } from '@tutorias/contracts/common';
import type {
  GenerarRecomendacionRequest,
  ListarRecomendacionesQuery,
} from '@tutorias/contracts/recomendaciones';
import { currentUser } from '../../platform/auth';
import { sendCreated, sendOk } from '../../platform/http';
import type { RecomendacionesService } from './recomendaciones.service';

export function createRecomendacionesController(service: RecomendacionesService) {
  return {
    async generar(req: Request<unknown, unknown, GenerarRecomendacionRequest>, res: Response) {
      sendCreated(res, await service.generar(req.body.solicitudId, currentUser(req).id));
    },

    async listar(req: Request, res: Response) {
      const { solicitudId } = req.query as unknown as ListarRecomendacionesQuery;
      sendOk(res, await service.listarPorSolicitud(solicitudId));
    },

    async obtener(req: Request<IdParams>, res: Response) {
      sendOk(res, await service.obtener(req.params.id));
    },
  };
}
