import { Router } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiErrorBody } from '@tutorias/contracts/common';
import { loadConfig } from '../config';
import { createDb } from '../db';
import { createLogger } from '../logger';
import { AppError } from './app-error';
import { createHttpApp } from './create-http-app';
import { sendOk } from './envelope';
import { validate } from './validate';

// Base inalcanzable: la app no consulta la BD salvo en /health/ready.
const config = loadConfig({
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgres://nadie:nada@127.0.0.1:1/inexistente',
  BODY_LIMIT: '1kb',
});
const logger = createLogger(config);
const db = createDb(config.databaseUrl, logger);

const router = Router();
router.post(
  '/eco/:id',
  validate({
    params: z.object({ id: z.uuid() }),
    query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    body: z.object({
      nombre: z.string().min(1),
      franjas: z.array(z.object({ inicio: z.string() })),
    }),
  }),
  (req, res) => {
    sendOk(res, { params: req.params, query: req.query, body: req.body });
  },
);
router.get('/app-error', () => {
  throw AppError.conflict('SOLICITUD_NO_ABIERTA', 'La solicitud no está abierta');
});
router.get('/unique', () => {
  throw Object.assign(new Error('duplicate key'), { code: '23505' });
});
router.get('/fk', () => {
  throw Object.assign(new Error('fk'), { code: '23503' });
});
router.get('/boom', async () => {
  throw new Error('detalle interno que no debe salir');
});

const app = createHttpApp({
  config,
  db,
  logger,
  mount: (a) => a.use('/api/v1', router),
});
const http = supertest(app);

function expectErrorEnvelope(body: unknown) {
  expect(ApiErrorBody.safeParse(body).success).toBe(true);
}

describe('plataforma HTTP', () => {
  it('validate aplica coerciones y defaults', async () => {
    const id = '6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d';
    const res = await http.post(`/api/v1/eco/${id}?page=2`).send({ nombre: 'x', franjas: [] });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      params: { id },
      query: { page: 2 },
      body: { nombre: 'x', franjas: [] },
    });
  });

  it('ZodError → 400 VALIDATION_ERROR con details[].path', async () => {
    const res = await http
      .post('/api/v1/eco/6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d')
      .send({ nombre: '', franjas: [{ inicio: 3 }] });
    expect(res.status).toBe(400);
    expectErrorEnvelope(res.body);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['nombre', 'franjas.0.inicio']));
  });

  it('el requestId del error coincide con la cabecera x-request-id', async () => {
    const res = await http.get('/api/v1/app-error');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SOLICITUD_NO_ABIERTA');
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('reutiliza un x-request-id entrante válido', async () => {
    const res = await http.get('/api/v1/app-error').set('x-request-id', 'abc-123-def-456');
    expect(res.body.error.requestId).toBe('abc-123-def-456');
  });

  it('PostgreSQL 23505 → 409 CONFLICT y 23503 → 409 REFERENCE_CONFLICT', async () => {
    const unique = await http.get('/api/v1/unique');
    expect(unique.status).toBe(409);
    expect(unique.body.error.code).toBe('CONFLICT');
    const fk = await http.get('/api/v1/fk');
    expect(fk.status).toBe(409);
    expect(fk.body.error.code).toBe('REFERENCE_CONFLICT');
  });

  it('error desconocido → 500 INTERNAL_ERROR sin detalles internos', async () => {
    const res = await http.get('/api/v1/boom');
    expect(res.status).toBe(500);
    expectErrorEnvelope(res.body);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('detalle interno');
  });

  it('JSON mal formado → 400 y cuerpo grande → 413', async () => {
    const malformed = await http
      .post('/api/v1/eco/6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d')
      .set('Content-Type', 'application/json')
      .send('{"nombre":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');

    const big = await http
      .post('/api/v1/eco/6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d')
      .send({ nombre: 'x'.repeat(5000), franjas: [] });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('ruta inexistente → 404 NOT_FOUND con el sobre', async () => {
    const res = await http.get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expectErrorEnvelope(res.body);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('/health responde y /health/ready da 503 si la BD no responde', async () => {
    const live = await http.get('/health');
    expect(live.status).toBe(200);
    expect(live.body).toEqual({ data: { status: 'ok' } });
    const ready = await http.get('/health/ready');
    expect(ready.status).toBe(503);
    expect(ready.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('cabeceras de seguridad (helmet) y sin x-powered-by', async () => {
    const res = await http.get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
