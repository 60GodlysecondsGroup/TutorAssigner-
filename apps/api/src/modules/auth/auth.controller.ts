import type { Request, Response } from 'express';
import type { LoginRequest } from '@tutorias/contracts/auth';
import { currentUser, type SessionService } from '../../platform/auth';
import { sendNoContent, sendOk } from '../../platform/http';
import type { AuthService } from './auth.service';

export function createAuthController(service: AuthService, session: SessionService) {
  return {
    async login(req: Request<unknown, unknown, Required<LoginRequest>>, res: Response) {
      const { usuario, token } = await service.login(req.body.email, req.body.password);
      res.cookie(session.cookieName, token, session.cookieOptions());
      sendOk(res, usuario);
    },

    logout(_req: Request, res: Response) {
      res.clearCookie(session.cookieName, session.clearCookieOptions());
      sendNoContent(res);
    },

    async me(req: Request, res: Response) {
      sendOk(res, await service.me(currentUser(req).id));
    },
  };
}
