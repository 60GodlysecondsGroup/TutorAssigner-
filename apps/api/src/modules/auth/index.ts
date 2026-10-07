/**
 * Módulo Auth (Dev 1) — única puerta de entrada.
 * Expone: router de `/api/v1/auth` (login, logout, me), `requireAuth` y `requireRole`.
 * Tabla propia: `usuarios`.
 */
import type { Config } from '../../platform/config';
import type { Db } from '../../platform/db';
import { createRequireAuth, createSessionService, requireRole } from '../../platform/auth';
import { createAuthController } from './auth.controller';
import { createAuthRepository } from './auth.repository';
import { createAuthRouter } from './auth.routes';
import { createAuthService } from './auth.service';
import { createPasswordHasher } from './password';

export function createAuthModule({ db, config }: { db: Db; config: Config }) {
  const session = createSessionService(config);
  const requireAuth = createRequireAuth(session);
  const service = createAuthService({
    repo: createAuthRepository(db),
    passwords: createPasswordHasher(config.bcryptCost),
    session,
  });
  const router = createAuthRouter({
    controller: createAuthController(service, session),
    requireAuth,
    loginRateLimitMax: config.loginRateLimitMax,
  });

  return { router, requireAuth, requireRole, session };
}

export type AuthModule = ReturnType<typeof createAuthModule>;
