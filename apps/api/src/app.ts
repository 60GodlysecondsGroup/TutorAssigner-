/**
 * Composición del API (Dev 1, archivo sensible: un cambio a la vez).
 * Cada módulo se crea con sus dependencias explícitas y registra solo su prefijo de URL.
 * La dirección de dependencias es única: Recomendaciones → Tutores, Solicitudes (y el motor).
 */
import type { Router } from 'express';
import type { Config } from './platform/config';
import type { Db } from './platform/db';
import type { Logger } from './platform/logger';
import { createHttpApp } from './platform/http';
import { createAuthModule } from './modules/auth';
import { createRecomendacionesModule } from './modules/recomendaciones';
import { createSolicitudesModule } from './modules/solicitudes';
import { createTutoresModule } from './modules/tutores';

export type AppDeps = { config: Config; db: Db; logger: Logger };

export type AppOptions = {
  /**
   * Routers adicionales bajo `/api/v1` (con sesión obligatoria). Solo para tests, p. ej. el
   * módulo `_plantilla`; en producción no se usa.
   */
  extraRouters?: Router[];
};

export function createApp({ config, db, logger }: AppDeps, options: AppOptions = {}) {
  const auth = createAuthModule({ db, config });
  const tutores = createTutoresModule({ db });
  const solicitudes = createSolicitudesModule({ db });
  const recomendaciones = createRecomendacionesModule({
    db,
    tutores: tutores.api,
    solicitudes: solicitudes.api,
  });

  return createHttpApp({
    config,
    db,
    logger,
    mount(app) {
      app.use('/api/v1/auth', auth.router);
      app.use(
        '/api/v1',
        auth.requireAuth,
        tutores.router,
        solicitudes.router,
        recomendaciones.router,
        ...(options.extraRouters ?? []),
      );
    },
  });
}
