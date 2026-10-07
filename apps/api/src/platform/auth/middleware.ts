import type { RequestHandler } from 'express';
import type { Rol } from '@tutorias/contracts/auth';
import { AppError } from '../http/app-error';
import type { SessionService } from './session';

/**
 * Exige una sesión válida y deja el usuario en `req.user`. Se aplica en `app.ts` a todo
 * `/api/v1` salvo `/auth/login`; sin cookie válida responde 401 `UNAUTHENTICATED`.
 */
export function createRequireAuth(session: SessionService): RequestHandler {
  return (req, _res, next) => {
    const token: unknown = req.cookies?.[session.cookieName];
    const user = session.verify(typeof token === 'string' ? token : undefined);
    if (!user) return next(AppError.unauthenticated());
    req.user = user;
    next();
  };
}

/**
 * Exige uno de los roles indicados (403 `FORBIDDEN`). Se declara en cada ruta de cada módulo:
 * `router.get('/tutores', requireRole('COORDINADOR'), ...)`.
 */
export function requireRole(...roles: [Rol, ...Rol[]]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthenticated());
    if (!roles.includes(req.user.rol)) return next(AppError.forbidden());
    next();
  };
}

/** Usuario autenticado de la petición; lanza 401 si una ruta lo pide sin `requireAuth`. */
export function currentUser(req: Express.Request) {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}
