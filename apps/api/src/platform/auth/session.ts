/**
 * Sesión: JWT firmado (HS256) en una cookie httpOnly, SameSite=Lax y Secure en producción.
 * El token solo lleva el id y el rol (datos mínimos); el resto se consulta en `GET /auth/me`.
 */
import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { Rol, SESSION_COOKIE } from '@tutorias/contracts/auth';
import { Id } from '@tutorias/contracts/common';
import type { Config } from '../config';

export type SessionUser = { id: string; rol: Rol };

const ISSUER = 'tutorias-api';
const AUDIENCE = 'tutorias-web';

export type SessionService = {
  cookieName: string;
  sign(user: SessionUser): string;
  /** Devuelve el usuario o `null` si el token falta, expiró o fue alterado. */
  verify(token: string | undefined): SessionUser | null;
  cookieOptions(): CookieOptions;
  clearCookieOptions(): CookieOptions;
};

export function createSessionService(
  config: Pick<Config, 'jwtSecret' | 'sessionTtlSeconds' | 'cookieSecure'>,
): SessionService {
  const base: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
  };

  return {
    cookieName: SESSION_COOKIE,

    sign(user) {
      return jwt.sign({ rol: user.rol }, config.jwtSecret, {
        algorithm: 'HS256',
        subject: user.id,
        issuer: ISSUER,
        audience: AUDIENCE,
        expiresIn: config.sessionTtlSeconds,
      });
    },

    verify(token) {
      if (!token) return null;
      try {
        const payload = jwt.verify(token, config.jwtSecret, {
          algorithms: ['HS256'],
          issuer: ISSUER,
          audience: AUDIENCE,
        });
        if (typeof payload === 'string') return null;
        const id = Id.safeParse(payload.sub);
        const rol = Rol.safeParse(payload.rol);
        return id.success && rol.success ? { id: id.data, rol: rol.data } : null;
      } catch {
        return null;
      }
    },

    cookieOptions() {
      return { ...base, maxAge: config.sessionTtlSeconds * 1000 };
    },

    clearCookieOptions() {
      return base;
    },
  };
}
