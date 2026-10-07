import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../http/error-handler';
import { requestId } from '../http/request-id';
import { createLogger } from '../logger';
import { createRequireAuth, requireRole } from './middleware';
import { createSessionService } from './session';

const config = { jwtSecret: 'x'.repeat(40), sessionTtlSeconds: 3600, cookieSecure: false };
const session = createSessionService(config);
const user = { id: '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d', rol: 'COORDINADOR' as const };

describe('session', () => {
  it('firma y verifica un token', () => {
    expect(session.verify(session.sign(user))).toEqual(user);
  });

  it('rechaza token ausente, alterado, con otro secreto o expirado', () => {
    const token = session.sign(user);
    expect(session.verify(undefined)).toBeNull();
    expect(session.verify(`${token}x`)).toBeNull();
    expect(createSessionService({ ...config, jwtSecret: 'y'.repeat(40) }).verify(token)).toBeNull();
    const expirado = jwt.sign({ rol: 'COORDINADOR' }, config.jwtSecret, {
      subject: user.id,
      issuer: 'tutorias-api',
      audience: 'tutorias-web',
      expiresIn: -10,
    });
    expect(session.verify(expirado)).toBeNull();
  });

  it('rechaza algoritmo "none" y payload con rol desconocido', () => {
    const none = jwt.sign({ rol: 'COORDINADOR' }, '', { algorithm: 'none', subject: user.id });
    expect(session.verify(none)).toBeNull();
    const rolRaro = jwt.sign({ rol: 'ADMIN' }, config.jwtSecret, {
      subject: user.id,
      issuer: 'tutorias-api',
      audience: 'tutorias-web',
    });
    expect(session.verify(rolRaro)).toBeNull();
  });

  it('cookie httpOnly, SameSite=Lax y con maxAge', () => {
    expect(session.cookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3_600_000,
    });
  });
});

describe('requireAuth / requireRole', () => {
  const app = express();
  app.use(requestId());
  app.use(cookieParser());
  app.get('/privado', createRequireAuth(session), (req, res) => {
    res.json({ data: req.user });
  });
  app.get('/sin-auth-con-rol', requireRole('COORDINADOR'), (_req, res) => {
    res.json({ data: 'ok' });
  });
  app.get(
    '/rol-ajeno',
    (req, _res, next) => {
      // Simula un rol futuro (PV-02) que no está autorizado en esta ruta.
      req.user = { id: user.id, rol: 'ESTUDIANTE' as never };
      next();
    },
    requireRole('COORDINADOR'),
    (_req, res) => {
      res.json({ data: 'ok' });
    },
  );
  app.use(errorHandler(createLogger({ logLevel: 'silent', env: 'test' })));
  const http = supertest(app);

  it('401 sin cookie', async () => {
    const res = await http.get('/privado');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('deja pasar con cookie válida y expone req.user', async () => {
    const res = await http
      .get('/privado')
      .set('Cookie', `${session.cookieName}=${session.sign(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(user);
  });

  it('requireRole con rol no autorizado responde 403', async () => {
    const res = await http.get('/rol-ajeno');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('requireRole sin usuario responde 401', async () => {
    const res = await http.get('/sin-auth-con-rol');
    expect(res.status).toBe(401);
  });
});
