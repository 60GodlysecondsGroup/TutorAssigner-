import { Writable } from 'node:stream';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LoginResponse, MeResponse, SESSION_COOKIE } from '@tutorias/contracts/auth';
import { ApiErrorBody } from '@tutorias/contracts/common';
import { createLogger } from '../../../platform/logger';
import {
  closeTestDb,
  createTestApp,
  ensureTestUser,
  getTestDb,
  TEST_USER,
  testConfig,
} from '../../../../test/helpers';

function sessionCookie(res: supertest.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
}

describe('Auth (integración)', () => {
  beforeAll(async () => {
    await ensureTestUser(getTestDb());
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('login correcto: 200, usuario del contrato y cookie httpOnly SameSite=Lax', async () => {
    const { request } = await createTestApp({ as: 'anonimo' });
    const res = await request.post('/api/v1/auth/login').send({
      email: TEST_USER.email.toUpperCase(),
      password: TEST_USER.password,
    });
    expect(res.status).toBe(200);
    expect(LoginResponse.parse(res.body).data.email).toBe(TEST_USER.email);
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Secure/i); // COOKIE_SECURE=false fuera de producción
  });

  it('flujo completo: login → me → logout → me 401', async () => {
    const { app } = await createTestApp({ as: 'anonimo' });
    const agent = supertest.agent(app);

    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    expect(login.status).toBe(200);

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(MeResponse.parse(me.body).data.nombre).toBe(TEST_USER.nombre);

    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(204);
    expect(sessionCookie(logout)).toMatch(/Expires=Thu, 01 Jan 1970/);

    const after = await agent.get('/api/v1/auth/me');
    expect(after.status).toBe(401);
  });

  it('contraseña incorrecta y correo inexistente → 401 con el mismo mensaje', async () => {
    const { request } = await createTestApp({ as: 'anonimo' });
    const mala = await request
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: 'otra' });
    const nadie = await request
      .post('/api/v1/auth/login')
      .send({ email: 'nadie@tutorias.test', password: 'otra' });
    for (const res of [mala, nadie]) {
      expect(res.status).toBe(401);
      expect(ApiErrorBody.parse(res.body).error.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(sessionCookie(res)).toBeUndefined();
    }
    expect(mala.body.error.message).toBe(nadie.body.error.message);
  });

  it('cuerpo inválido → 400 VALIDATION_ERROR con details', async () => {
    const { request } = await createTestApp({ as: 'anonimo' });
    const res = await request.post('/api/v1/auth/login').send({ email: 'no-es-correo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });

  it('usuario desactivado: no inicia sesión y su sesión vigente deja de valer en /me', async () => {
    const db = getTestDb();
    const t = await createTestApp();
    await db('usuarios').where({ id: t.usuario!.id }).update({ activo: false });
    try {
      const me = await t.request.get('/api/v1/auth/me');
      expect(me.status).toBe(401);
      const login = await t.request
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      expect(login.status).toBe(401);
    } finally {
      await db('usuarios').where({ id: t.usuario!.id }).update({ activo: true });
    }
  });

  it('rate limit: tras N intentos fallidos responde 429 AUTH_RATE_LIMITED', async () => {
    const { request } = await createTestApp({ as: 'anonimo', env: { LOGIN_RATE_LIMIT_MAX: '3' } });
    for (let i = 0; i < 3; i++) {
      const res = await request
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'mala' });
      expect(res.status).toBe(401);
    }
    const bloqueado = await request
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error.code).toBe('AUTH_RATE_LIMITED');
  });

  it('la contraseña, el hash, la cookie y los query strings nunca aparecen en los logs', async () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        lines.push(String(chunk));
        cb();
      },
    });
    const logger = createLogger({ ...testConfig(), logLevel: 'trace' }, sink);
    const { request } = await createTestApp({ as: 'anonimo', logger });
    await request
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    await request
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: 'contrasena-erronea' });
    await request.get('/api/v1/auth/me?q=Nombre-Personal-De-Estudiante');
    const hash = (
      await getTestDb()('usuarios').where({ email: TEST_USER.email }).first('password_hash')
    ).password_hash;

    const output = lines.join('\n');
    expect(output.length).toBeGreaterThan(0);
    expect(output).not.toContain(TEST_USER.password);
    expect(output).not.toContain('contrasena-erronea');
    expect(output).not.toContain('Nombre-Personal-De-Estudiante');
    expect(output).toContain('"path":"/api/v1/auth/me"');
    expect(output).not.toContain(hash);
    expect(output).not.toMatch(new RegExp(`${SESSION_COOKIE}=ey`));
  });
});
