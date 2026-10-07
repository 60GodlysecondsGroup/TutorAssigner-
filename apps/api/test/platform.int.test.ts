/**
 * Integración de la plataforma: composición de `app.ts`, protección de rutas y health.
 * DoD F2/F9: sin cookie → 401 en todo salvo /auth/login y /health; módulos stub → 501.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { ApiErrorBody } from '@tutorias/contracts/common';
import { closeTestDb, createTestApp } from './helpers';

const RUTAS_DE_MODULOS = [
  '/api/v1/materias',
  '/api/v1/tutores',
  '/api/v1/estudiantes',
  '/api/v1/solicitudes',
  '/api/v1/recomendaciones',
  '/api/v1/asignaciones',
  '/api/v1/matching/config',
];

describe('Plataforma (integración)', () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it('/health y /health/ready responden 200 con la BD disponible y sin sesión', async () => {
    const { request } = await createTestApp({ as: 'anonimo' });
    expect((await request.get('/health')).status).toBe(200);
    const ready = await request.get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ data: { status: 'ok', checks: { db: 'ok' } } });
  });

  it.each([...RUTAS_DE_MODULOS, '/api/v1/auth/me', '/api/v1/ruta-inexistente'])(
    'sin sesión GET %s → 401 UNAUTHENTICATED',
    async (ruta) => {
      const { request } = await createTestApp({ as: 'anonimo' });
      const res = await request.get(ruta);
      expect(res.status).toBe(401);
      expect(ApiErrorBody.parse(res.body).error.code).toBe('UNAUTHENTICATED');
    },
  );

  it.each(RUTAS_DE_MODULOS)(
    'con sesión GET %s → 501 mientras el módulo es un stub',
    async (ruta) => {
      const { request } = await createTestApp();
      const res = await request.get(ruta);
      expect(res.status).toBe(501);
      expect(ApiErrorBody.parse(res.body).error.code).toBe('NOT_IMPLEMENTED');
    },
  );

  it('con sesión, una ruta inexistente → 404 NOT_FOUND', async () => {
    const { request } = await createTestApp();
    const res = await request.get('/api/v1/ruta-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('cookie con firma inválida → 401', async () => {
    const { app } = await createTestApp({ as: 'anonimo' });
    const supertest = (await import('supertest')).default;
    const res = await supertest(app)
      .get('/api/v1/tutores')
      .set('Cookie', 'tutorias_session=ey.invalido.token');
    expect(res.status).toBe(401);
  });
});
