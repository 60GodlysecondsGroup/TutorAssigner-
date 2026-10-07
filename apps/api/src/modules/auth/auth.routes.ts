import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { LoginRequest } from '@tutorias/contracts/auth';
import { validate } from '../../platform/http';
import type { createAuthController } from './auth.controller';
import { demasiadosIntentos } from './auth.errors';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Limita los intentos fallidos de login por IP; los exitosos no cuentan. */
export function createLoginRateLimiter(max: number): RequestHandler {
  return rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    limit: max,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(demasiadosIntentos()),
  });
}

export function createAuthRouter(deps: {
  controller: ReturnType<typeof createAuthController>;
  requireAuth: RequestHandler;
  loginRateLimitMax: number;
}): Router {
  const { controller, requireAuth } = deps;
  const router = Router();

  router.post(
    '/login',
    createLoginRateLimiter(deps.loginRateLimitMax),
    validate({ body: LoginRequest }),
    controller.login,
  );
  router.post('/logout', requireAuth, controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
}
