/** Traduce HTTP ↔ caso de uso. Sin reglas de negocio ni SQL; responde siempre con el sobre. */
import type { Request, Response } from 'express';
import type { IdParams } from '@tutorias/contracts/common';
import { pageMeta, sendCreated, sendOk, sendPage } from '../../platform/http';
import type {
  CrearEjemploRequest,
  EditarEjemploRequest,
  ListarEjemplosQuery,
} from './plantilla.schemas';
import type { PlantillaService } from './plantilla.service';

export function createPlantillaController(service: PlantillaService) {
  return {
    async listar(req: Request, res: Response) {
      const query = req.query as unknown as ListarEjemplosQuery;
      const { items, total } = await service.listar(query);
      sendPage(res, items, pageMeta(query, total));
    },

    async obtener(req: Request<IdParams>, res: Response) {
      sendOk(res, await service.obtener(req.params.id));
    },

    async crear(req: Request<unknown, unknown, CrearEjemploRequest>, res: Response) {
      sendCreated(res, await service.crear(req.body));
    },

    async editar(req: Request<IdParams, unknown, EditarEjemploRequest>, res: Response) {
      sendOk(res, await service.editar(req.params.id, req.body));
    },
  };
}
