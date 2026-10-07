/** Configuración versionada de pesos (RN-R04) contra PostgreSQL. */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ConfiguracionMatching } from '@tutorias/contracts/recomendaciones';
import { actualizarConfigValida } from '@tutorias/contracts/recomendaciones/fixtures';
import { configV1 } from '@tutorias/contracts/matching/fixtures';
import { closeTestDb } from '../../../../test/helpers';
import { crearEntorno, limpiar, sembrarConfigV1, type Entorno } from './support';

describe('GET/PUT /matching/config', () => {
  let e: Entorno;

  beforeEach(async () => {
    e = await crearEntorno();
    await limpiar(e.db);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('sin configuración vigente → 404 CONFIG_NOT_FOUND', async () => {
    const res = await e.request.get('/api/v1/matching/config');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CONFIG_NOT_FOUND');
  });

  it('devuelve la versión vigente según el contrato', async () => {
    await sembrarConfigV1(e.db);
    const res = await e.request.get('/api/v1/matching/config');
    expect(res.status).toBe(200);
    expect(ConfiguracionMatching.parse(res.body.data)).toMatchObject({
      version: 1,
      vigente: true,
      pesos: configV1.pesos,
      parametros: configV1.parametros,
    });
  });

  it('PUT crea una versión nueva vigente y deja intacta la anterior', async () => {
    await sembrarConfigV1(e.db);
    const res = await e.request.put('/api/v1/matching/config').send(actualizarConfigValida);
    expect(res.status).toBe(201);
    expect(ConfiguracionMatching.parse(res.body.data)).toMatchObject({
      version: 2,
      vigente: true,
      ...actualizarConfigValida,
    });

    const filas = await e
      .db('matching_config')
      .orderBy('version')
      .select('version', 'vigente', 'pesos', 'creada_por');
    expect(filas).toEqual([
      { version: 1, vigente: false, pesos: configV1.pesos, creada_por: null },
      { version: 2, vigente: true, pesos: actualizarConfigValida.pesos, creada_por: e.usuario.id },
    ]);
    expect((await e.request.get('/api/v1/matching/config')).body.data.version).toBe(2);
  });

  it('pesos que no suman 1 o parámetros < 1 → 422 PESOS_INVALIDOS con detalle', async () => {
    await sembrarConfigV1(e.db);
    const suma = await e.request.put('/api/v1/matching/config').send({
      ...actualizarConfigValida,
      pesos: { ...actualizarConfigValida.pesos, dominio: 0.9 },
    });
    expect(suma.status).toBe(422);
    expect(suma.body.error).toMatchObject({
      code: 'PESOS_INVALIDOS',
      details: [{ path: 'pesos' }],
    });

    const topN = await e.request.put('/api/v1/matching/config').send({
      ...actualizarConfigValida,
      parametros: { topN: 0, bloquesHorarioIdeal: 2 },
    });
    expect(topN.status).toBe(422);
    expect(topN.body.error.details).toEqual([expect.objectContaining({ path: 'parametros.topN' })]);

    // Nada cambió: sigue vigente la v1.
    expect(await e.db('matching_config').count({ n: '*' }).first()).toEqual({ n: '1' });
  });

  it('forma inválida (falta un peso) → 400 VALIDATION_ERROR', async () => {
    const res = await e.request
      .put('/api/v1/matching/config')
      .send({ pesos: { dominio: 1 }, parametros: { topN: 3, bloquesHorarioIdeal: 3 } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('versiones concurrentes: números consecutivos y una sola vigente', async () => {
    await sembrarConfigV1(e.db);
    const respuestas = await Promise.all(
      [0, 1, 2, 3].map(() => e.request.put('/api/v1/matching/config').send(actualizarConfigValida)),
    );
    expect(respuestas.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    const versiones = respuestas.map((r) => r.body.data.version).sort();
    expect(versiones).toEqual([2, 3, 4, 5]);
    const vigentes = await e.db('matching_config').where({ vigente: true }).select('version');
    expect(vigentes).toEqual([{ version: 5 }]);
  });

  it('sin sesión → 401', async () => {
    expect((await e.anonimo.get('/api/v1/matching/config')).status).toBe(401);
  });
});
