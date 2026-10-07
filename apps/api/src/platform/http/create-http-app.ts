/**
 * Arma la aplicación Express con todo lo transversal (requestId, logs, seguridad, JSON, cookies,
 * health, 404 y errores) y deja que `mount` registre los módulos. Lo usa `app.ts`; ningún módulo
 * lo llama directamente.
 */
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Config } from '../config';
import type { Db } from '../db';
import { createHealthRouter } from '../health';
import type { Logger } from '../logger';
import { errorHandler, notFoundHandler } from './error-handler';
import { requestId } from './request-id';

export type HttpAppOptions = {
  config: Config;
  db: Db;
  logger: Logger;
  mount: (app: Express) => void;
};

export function createHttpApp({ config, db, logger, mount }: HttpAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(requestId());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      // Solo metadatos: nunca cuerpos, cabeceras con credenciales ni query strings (pueden
      // llevar datos personales, p. ej. `?q=<nombre>`).
      serializers: {
        req: (req: { id: unknown; method: string; url: string; originalUrl?: string }) => ({
          id: req.id,
          method: req.method,
          path: (req.originalUrl ?? req.url).split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
    }),
  );
  app.use(
    helmet({
      // `upgrade-insecure-requests` solo tiene sentido detrás de HTTPS (cookie Secure).
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: config.cookieSecure ? [] : null },
      },
    }),
  );
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(cookieParser());

  app.use(createHealthRouter(db));
  mount(app);
  app.use('/api', notFoundHandler);

  if (config.webDistDir) serveSpa(app, config.webDistDir);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}

/** Producción: Express sirve el build de Vite y devuelve `index.html` para las rutas de la SPA. */
function serveSpa(app: Express, dir: string) {
  const root = path.resolve(dir);
  app.use(express.static(root, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (req, res, next) => {
    if (!req.accepts('html')) return next();
    res.sendFile(path.join(root, 'index.html'), { maxAge: 0 });
  });
}
