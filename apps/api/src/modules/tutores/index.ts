/**
 * Módulo Tutores y Materias — STUB de Foundation (F2, Dev 1).
 * Dueño: Dev 2, que reemplaza este archivo en F4 siguiendo `modules/_plantilla`.
 *
 * Prefijos propios: `/materias`, `/tutores`. Mientras tanto responden 501 NOT_IMPLEMENTED.
 * API pública documentada (sección 6 del plan): `listarCandidatos(materiaId)`, `obtenerResumenes(ids)`.
 */
import { Router } from 'express';
import type { Db } from '../../platform/db';
import { requireRole } from '../../platform/auth';
import { AppError } from '../../platform/http';

const notImplemented = () => {
  throw AppError.notImplemented('Módulo Tutores aún no implementado');
};

export function createTutoresModule(_deps: { db: Db }) {
  const router = Router();
  router.use(['/materias', '/tutores'], requireRole('COORDINADOR'), notImplemented);

  const api = {
    listarCandidatos: async (_materiaId: string): Promise<never> => notImplemented(),
    obtenerResumenes: async (_ids: string[]): Promise<never> => notImplemented(),
  };

  return { router, api };
}

export type TutoresModule = ReturnType<typeof createTutoresModule>;
