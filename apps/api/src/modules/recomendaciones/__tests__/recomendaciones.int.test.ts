/** Generar y consultar recomendaciones (RN-R01, RN-R05) con fakes de los puertos y BD real. */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { evaluar } from '@tutorias/matching';
import { Recomendacion } from '@tutorias/contracts/recomendaciones';
import { actualizarConfigValida } from '@tutorias/contracts/recomendaciones/fixtures';
import { closeTestDb, createTestApp } from '../../../../test/helpers';
import { IDS } from '../fakes/datos';
import type { EntradaSnapshot } from '../recomendaciones.mapper';
import { crearEntorno, limpiar, ocuparCupo, sembrarConfigV1, type Entorno } from './support';

describe('POST/GET /recomendaciones', () => {
  let e: Entorno;

  beforeEach(async () => {
    e = await crearEntorno();
    await limpiar(e.db);
    await sembrarConfigV1(e.db);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const generar = (solicitudId: string) =>
    e.request.post('/api/v1/recomendaciones').send({ solicitudId });

  it('genera RECOMENDADO con ranking, desglose, descartados y justificación', async () => {
    await ocuparCupo(e.db, IDS.diego); // Diego (capacidad 1) queda sin cupo
    const res = await generar(IDS.solicitudLaura);
    expect(res.status).toBe(201);
    const rec = Recomendacion.parse(res.body.data);

    expect(rec).toMatchObject({
      solicitudId: IDS.solicitudLaura,
      resultado: 'RECOMENDADO',
      tutorRecomendadoId: IDS.ana,
      score: 96,
      configVersion: 1,
    });
    expect(rec.candidatos.map((c) => [c.nombre, c.posicion, c.score])).toEqual([
      ['Ana Torres', 1, 96],
      ['Beto Ruiz', 2, 77.3],
    ]);
    expect(rec.candidatos[0]!.desglose.map((d) => d.criterio)).toEqual([
      'dominio',
      'horario',
      'prioridad',
      'preferencias',
      'carga',
    ]);
    expect(rec.descartados).toEqual([
      { tutorId: IDS.carla, nombre: 'Carla Gómez', motivos: ['SIN_HORARIO_COMPATIBLE'] },
      { tutorId: IDS.diego, nombre: 'Diego Pardo', motivos: ['SIN_CUPO'] },
    ]);
    expect(rec.justificacion).toMatch(/^Ana Torres \(96\/100\): domina Cálculo I \(5\/5\)/);

    // Persistencia: 1 recomendación + 4 filas de candidatos (2 elegibles, 2 descartados).
    const filas = await e.db('recomendacion_candidatos').where({ recomendacion_id: rec.id });
    expect(filas).toHaveLength(4);
    expect(filas.filter((f) => f.elegible)).toHaveLength(2);
    const guardada = await e.db('recomendaciones').where({ id: rec.id }).first();
    expect(guardada.generada_por).toBe(e.usuario.id);
  });

  it('el snapshot guardado reproduce exactamente el mismo resultado', async () => {
    await ocuparCupo(e.db, IDS.beto);
    const { body } = await generar(IDS.solicitudLaura);
    const { entrada_snapshot: s } = (await e
      .db('recomendaciones')
      .where({ id: body.data.id })
      .first()) as {
      entrada_snapshot: EntradaSnapshot;
    };
    expect(s.contexto).toEqual({
      estudianteId: IDS.estudianteLaura,
      estudianteNombre: 'Laura Méndez',
      materiaNombre: 'Cálculo I',
    });
    expect(s.candidatos.find((c) => c.tutorId === IDS.beto)?.asignacionesActivas).toBe(1);

    const r = evaluar(s.solicitud, s.candidatos, s.config);
    expect(r.justificacion).toBe(body.data.justificacion);
    expect(r.recomendado?.score).toBe(body.data.score);
    expect(
      [r.recomendado, ...r.alternativas].map((c) => [c!.tutorId, c!.score, c!.desglose]),
    ).toEqual(
      body.data.candidatos.map((c: { tutorId: string; score: number; desglose: unknown }) => [
        c.tutorId,
        c.score,
        c.desglose,
      ]),
    );
  });

  it('sin candidatos elegibles → SIN_CANDIDATOS con justificación de motivos', async () => {
    e.solicitudes.actualizar(IDS.solicitudLaura, {
      franjas: [{ dia: 6, inicio: '09:00', fin: '11:00' }],
    });
    const res = await generar(IDS.solicitudLaura);
    expect(res.status).toBe(201);
    const rec = Recomendacion.parse(res.body.data);
    expect(rec).toMatchObject({ resultado: 'SIN_CANDIDATOS', candidatos: [] });
    expect(rec.tutorRecomendadoId).toBeUndefined();
    expect(rec.score).toBeUndefined();
    expect(rec.descartados).toHaveLength(4);
    expect(rec.justificacion).toBe('No hay tutores elegibles: 4 sin horario compatible.');
  });

  it('solicitud inexistente → 404; no abierta → 409 SOLICITUD_NO_ABIERTA', async () => {
    const inexistente = await generar('00000000-0000-4000-8000-00000000abcd');
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error.code).toBe('SOLICITUD_NOT_FOUND');

    e.solicitudes.actualizar(IDS.solicitudLaura, { estado: 'CANCELADA' });
    const cancelada = await generar(IDS.solicitudLaura);
    expect(cancelada.status).toBe(409);
    expect(cancelada.body.error.code).toBe('SOLICITUD_NO_ABIERTA');
  });

  it('sin configuración vigente → 404 CONFIG_NOT_FOUND', async () => {
    await limpiar(e.db);
    const res = await generar(IDS.solicitudLaura);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CONFIG_NOT_FOUND');
  });

  it('historial: más reciente primero; cada una conserva su versión de pesos', async () => {
    const primera = (await generar(IDS.solicitudLaura)).body.data;
    await e.request.put('/api/v1/matching/config').send(actualizarConfigValida);
    const segunda = (await generar(IDS.solicitudLaura)).body.data;
    await generar(IDS.solicitudMateo);

    const res = await e.request.get(`/api/v1/recomendaciones?solicitudId=${IDS.solicitudLaura}`);
    expect(res.status).toBe(200);
    const historial = res.body.data.map((r: unknown) => Recomendacion.parse(r));
    expect(historial.map((r: Recomendacion) => [r.id, r.configVersion])).toEqual([
      [segunda.id, 2],
      [primera.id, 1],
    ]);
    // Los pesos nuevos cambian el resultado de la nueva, no el de la anterior.
    expect(historial[1].score).toBe(primera.score);
  });

  it('GET /recomendaciones/:id → detalle; inexistente → 404; sin solicitudId → 400', async () => {
    const { body } = await generar(IDS.solicitudLaura);
    const detalle = await e.request.get(`/api/v1/recomendaciones/${body.data.id}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.data).toEqual(body.data);

    const inexistente = await e.request.get(
      '/api/v1/recomendaciones/00000000-0000-4000-8000-00000000abcd',
    );
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error.code).toBe('RECOMENDACION_NOT_FOUND');

    expect((await e.request.get('/api/v1/recomendaciones')).status).toBe(400);
    expect((await e.request.post('/api/v1/recomendaciones').send({})).status).toBe(400);
  });

  it('sin sesión → 401', async () => {
    expect(
      (await e.anonimo.post('/api/v1/recomendaciones').send({ solicitudId: IDS.solicitudLaura }))
        .status,
    ).toBe(401);
  });
});

describe('módulo con los adaptadores reales (app.ts)', () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it('cableado real: solicitud inexistente → 404 y la config/asignaciones responden', async () => {
    const t = await createTestApp();
    await limpiar(t.db);
    await sembrarConfigV1(t.db);
    const generar = await t.request
      .post('/api/v1/recomendaciones')
      .send({ solicitudId: IDS.solicitudLaura });
    expect(generar.status).toBe(404);
    expect(generar.body.error.code).toBe('SOLICITUD_NOT_FOUND');

    expect((await t.request.get('/api/v1/matching/config')).status).toBe(200);
    expect((await t.request.get('/api/v1/asignaciones')).body).toEqual({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    });
  });
});
