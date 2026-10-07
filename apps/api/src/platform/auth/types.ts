import type { SessionUser } from './session';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Usuario autenticado; lo fija `requireAuth`. */
      user?: SessionUser;
    }
  }
}

export {};
