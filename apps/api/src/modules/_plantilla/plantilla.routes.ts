/** Declara método, URL, validación de forma y rol. Sin lógica. Solo rutas bajo el prefijo propio. */
import { Router } from 'express';
import { IdParams } from '@tutorias/contracts/common';
import { requireRole } from '../../platform/auth';
import { validate } from '../../platform/http';
import type { createPlantillaController } from './plantilla.controller';
import {
  CrearEjemploRequest,
  EditarEjemploRequest,
  ListarEjemplosQuery,
} from './plantilla.schemas';

export function createPlantillaRouter(controller: ReturnType<typeof createPlantillaController>) {
  const router = Router();
  const coordinador = requireRole('COORDINADOR');

  router.get('/ejemplos', coordinador, validate({ query: ListarEjemplosQuery }), controller.listar);
  router.get('/ejemplos/:id', coordinador, validate({ params: IdParams }), controller.obtener);
  router.post('/ejemplos', coordinador, validate({ body: CrearEjemploRequest }), controller.crear);
  router.patch(
    '/ejemplos/:id',
    coordinador,
    validate({ params: IdParams, body: EditarEjemploRequest }),
    controller.editar,
  );

  return router;
}
