/**
 * Módulo Recomendaciones, Asignaciones y Configuración — STUB de Foundation (F2, Dev 1).
 * Dueño: Dev 4, que reemplaza este archivo en F7 (puertos, adaptadores, fakes, servicios).
 *
 * Prefijos propios: `/recomendaciones`, `/asignaciones`, `/matching`. Mientras tanto responden
 * 501 NOT_IMPLEMENTED. Depende solo de la API pública de Tutores y Solicitudes (inyectada).
 */
import { Router } from 'express';
import type { Db } from '../../platform/db';
import { requireRole } from '../../platform/auth';
import { AppError } from '../../platform/http';
import type { SolicitudesModule } from '../solicitudes';
import type { TutoresModule } from '../tutores';

const notImplemented = () => {
  throw AppError.notImplemented('Módulo Recomendaciones aún no implementado');
};

export function createRecomendacionesModule(_deps: {
  db: Db;
  tutores: TutoresModule['api'];
  solicitudes: SolicitudesModule['api'];
}) {
  const router = Router();
  router.use(
    ['/recomendaciones', '/asignaciones', '/matching'],
    requireRole('COORDINADOR'),
    notImplemented,
  );

  return { router };
}
