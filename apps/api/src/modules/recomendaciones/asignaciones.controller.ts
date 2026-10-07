import type { Request, Response } from 'express';
import type { IdParams } from '@tutorias/contracts/common';
import type {
  CambiarEstadoAsignacionRequest,
  ConfirmarAsignacionRequest,
  ListarAsignacionesQuery,
} from '@tutorias/contracts/recomendaciones';
import { currentUser } from '../../platform/auth';
import { sendCreated, sendOk, sendPage } from '../../platform/http';
import type { AsignacionesService } from './asignaciones.service';

export function createAsignacionesController(service: AsignacionesService) {
  return {
    async confirmar(req: Request<unknown, unknown, ConfirmarAsignacionRequest>, res: Response) {
      sendCreated(res, await service.confirmar(req.body, currentUser(req).id));
    },

    async listar(req: Request, res: Response) {
      const { data, meta } = await service.listar(req.query as unknown as ListarAsignacionesQuery);
      sendPage(res, data, meta);
    },

    async cambiarEstado(
      req: Request<IdParams, unknown, CambiarEstadoAsignacionRequest>,
      res: Response,
    ) {
      sendOk(res, await service.cambiarEstado(req.params.id, req.body));
    },
  };
}
