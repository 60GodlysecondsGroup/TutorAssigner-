/**
 * `/health`: el proceso vive (liveness). `/health/ready`: además responde la base (readiness);
 * si no, 503 `SERVICE_UNAVAILABLE`. Son públicas (sin sesión) y no exponen detalles internos.
 */
import { Router } from 'express';
import { pingDb, type Db } from './db';
import { sendOk } from './http/envelope';
import { sendError } from './http/error-handler';

export function createHealthRouter(db: Db): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    sendOk(res, { status: 'ok' });
  });

  router.get('/health/ready', async (req, res) => {
    if (await pingDb(db)) {
      sendOk(res, { status: 'ok', checks: { db: 'ok' } });
      return;
    }
    sendError(req, res, {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'La base de datos no responde',
      details: [{ path: 'db', message: 'sin conexión' }],
    });
  });

  return router;
}
