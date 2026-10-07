/**
 * Módulo Estudiantes y Solicitudes — STUB de Foundation (F2, Dev 1).
 * Dueño: Dev 3, que reemplaza este archivo en F5 siguiendo `modules/_plantilla`.
 *
 * Prefijos propios: `/estudiantes`, `/solicitudes`. Mientras tanto responden 501 NOT_IMPLEMENTED.
 * API pública documentada (sección 6 del plan): `obtenerParaMatching(id)`, `marcarAsignada(id, trx)`.
 */
import { Router } from 'express';
import type { Db, Trx } from '../../platform/db';
import { requireRole } from '../../platform/auth';
import { AppError } from '../../platform/http';

const notImplemented = () => {
  throw AppError.notImplemented('Módulo Solicitudes aún no implementado');
};

export function createSolicitudesModule(_deps: { db: Db }) {
  const router = Router();
  router.use(['/estudiantes', '/solicitudes'], requireRole('COORDINADOR'), notImplemented);

  const api = {
    obtenerParaMatching: async (_id: string): Promise<never> => notImplemented(),
    marcarAsignada: async (_id: string, _trx: Trx): Promise<never> => notImplemented(),
  };

  return { router, api };
}

export type SolicitudesModule = ReturnType<typeof createSolicitudesModule>;
