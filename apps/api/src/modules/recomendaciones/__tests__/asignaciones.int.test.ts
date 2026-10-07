/** Confirmar, finalizar, cancelar y listar asignaciones (RN-R02, RN-R03, RN-R06). */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { pageEnvelope } from '@tutorias/contracts/common';
import { Asignacion } from '@tutorias/contracts/recomendaciones';
import { closeTestDb } from '../../../../test/helpers';
import { IDS } from '../fakes/datos';
import { crearEntorno, limpiar, ocuparCupo, sembrarConfigV1, type Entorno } from './support';

describe('asignaciones', () => {
  let e: Entorno;

  beforeEach(async () => {
    e = await crearEntorno();
    await limpiar(e.db);
    await sembrarConfigV1(e.db);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const recomendar = async (solicitudId = IDS.solicitudLaura) =>
    (await e.request.post('/api/v1/recomendaciones').send({ solicitudId })).body.data as {
      id: string;
      tutorRecomendadoId: string;
    };
  const confirmar = (body: object) => e.request.post('/api/v1/asignaciones').send(body);

  it('confirmar al recomendado → 201, ACTIVA, solicitud ASIGNADA y datos para la UI', async () => {
    const rec = await recomendar();
    const res = await confirmar({
      recomendacionId: rec.id,
      tutorId: rec.tutorRecomendadoId,
      motivoCambio: 'ignorado',
    });
    expect(res.status).toBe(201);
    expect(Asignacion.parse(res.body.data)).toMatchObject({
      solicitudId: IDS.solicitudLaura,
      tutorId: IDS.ana,
      tutorNombre: 'Ana Torres',
      estudianteNombre: 'Laura Méndez',
      materiaNombre: 'Cálculo I',
      recomendacionId: rec.id,
      score: 96,
      estado: 'ACTIVA',
      creadaPor: e.usuario.id,
    });
    expect(res.body.data.motivoCambio).toBeUndefined(); // al recomendado no se le guarda motivo
    expect(e.solicitudes.estado(IDS.solicitudLaura)).toBe('ASIGNADA');
  });

  it('alternativa sin motivo (o en blanco) → 422 MOTIVO_REQUERIDO; con motivo → 201', async () => {
    const rec = await recomendar();
    for (const motivoCambio of [undefined, '   ']) {
      const res = await confirmar({ recomendacionId: rec.id, tutorId: IDS.beto, motivoCambio });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('MOTIVO_REQUERIDO');
    }
    const ok = await confirmar({
      recomendacionId: rec.id,
      tutorId: IDS.beto,
      motivoCambio: ' Ya trabajaron juntos ',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({
      tutorId: IDS.beto,
      motivoCambio: 'Ya trabajaron juntos',
      score: 77.3,
    });
  });

  it('tutor descartado o ajeno a la recomendación → 422 TUTOR_NO_ELEGIBLE', async () => {
    const rec = await recomendar();
    for (const tutorId of [IDS.carla, '00000000-0000-4000-8000-00000000abcd']) {
      const res = await confirmar({ recomendacionId: rec.id, tutorId, motivoCambio: 'x' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('TUTOR_NO_ELEGIBLE');
    }
  });

  it('recomendación inexistente → 404; cuerpo inválido → 400', async () => {
    const res = await confirmar({
      recomendacionId: '00000000-0000-4000-8000-00000000abcd',
      tutorId: IDS.ana,
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECOMENDACION_NOT_FOUND');
    expect((await confirmar({ tutorId: IDS.ana })).status).toBe(400);
  });

  it('segunda confirmación de la misma solicitud → 409 SOLICITUD_YA_ASIGNADA', async () => {
    const rec = await recomendar();
    expect((await confirmar({ recomendacionId: rec.id, tutorId: IDS.ana })).status).toBe(201);
    const otra = await confirmar({ recomendacionId: rec.id, tutorId: IDS.beto, motivoCambio: 'x' });
    expect(otra.status).toBe(409);
    expect(otra.body.error.code).toBe('SOLICITUD_YA_ASIGNADA');
  });

  it('tutor sin cupo al confirmar → 409 SIN_CUPO_TUTOR', async () => {
    const rec = await recomendar();
    await ocuparCupo(e.db, IDS.beto, 2); // Beto tiene capacidad 2
    const res = await confirmar({ recomendacionId: rec.id, tutorId: IDS.beto, motivoCambio: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SIN_CUPO_TUTOR');
  });

  it.each([
    ['tutor desactivado', (x: Entorno) => x.tutores.actualizar(IDS.ana, { activo: false })],
    [
      'tutor sin horario',
      (x: Entorno) =>
        x.tutores.actualizar(IDS.ana, { franjas: [{ dia: 7, inicio: '08:00', fin: '09:00' }] }),
    ],
    [
      'solicitud editada',
      (x: Entorno) => x.solicitudes.actualizar(IDS.solicitudLaura, { duracionSesionMin: 90 }),
    ],
  ])('datos cambiados (%s) → 409 RECOMENDACION_OBSOLETA', async (_caso, cambiar) => {
    const rec = await recomendar();
    cambiar(e);
    const res = await confirmar({ recomendacionId: rec.id, tutorId: IDS.ana });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RECOMENDACION_OBSOLETA');
    expect(await e.db('asignaciones').count({ n: '*' }).first()).toEqual({ n: '0' });
  });

  it('confirmar una recomendación superada por otra más reciente → 409 RECOMENDACION_OBSOLETA', async () => {
    const vieja = await recomendar();
    await recomendar();
    const res = await confirmar({ recomendacionId: vieja.id, tutorId: IDS.ana });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RECOMENDACION_OBSOLETA');
  });

  it('solicitud cancelada entre recomendar y confirmar → 409 SOLICITUD_NO_ABIERTA', async () => {
    const rec = await recomendar();
    e.solicitudes.actualizar(IDS.solicitudLaura, { estado: 'CANCELADA' });
    const res = await confirmar({ recomendacionId: rec.id, tutorId: IDS.ana });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SOLICITUD_NO_ABIERTA');
  });

  describe('PATCH /asignaciones/:id', () => {
    const crearActiva = async () => {
      const rec = await recomendar();
      return (await confirmar({ recomendacionId: rec.id, tutorId: IDS.ana })).body.data
        .id as string;
    };
    const cambiar = (id: string, estado: string) =>
      e.request.patch(`/api/v1/asignaciones/${id}`).send({ estado });

    it('ACTIVA → FINALIZADA; luego cualquier cambio → 409 TRANSICION_INVALIDA', async () => {
      const id = await crearActiva();
      const fin = await cambiar(id, 'FINALIZADA');
      expect(fin.status).toBe(200);
      expect(Asignacion.parse(fin.body.data).estado).toBe('FINALIZADA');
      expect(e.solicitudes.estado(IDS.solicitudLaura)).toBe('ASIGNADA');

      const otra = await cambiar(id, 'CANCELADA');
      expect(otra.status).toBe(409);
      expect(otra.body.error.code).toBe('TRANSICION_INVALIDA');
    });

    it('ACTIVA → CANCELADA reabre la solicitud y permite una nueva asignación', async () => {
      const id = await crearActiva();
      expect((await cambiar(id, 'CANCELADA')).body.data.estado).toBe('CANCELADA');
      expect(e.solicitudes.estado(IDS.solicitudLaura)).toBe('ABIERTA');
      expect((await cambiar(id, 'FINALIZADA')).status).toBe(409);

      const rec = await recomendar();
      expect((await confirmar({ recomendacionId: rec.id, tutorId: IDS.ana })).status).toBe(201);
    });

    it('estado ACTIVA no es una transición válida (400) e inexistente → 404', async () => {
      const id = await crearActiva();
      expect((await cambiar(id, 'ACTIVA')).status).toBe(400);
      const nada = await cambiar('00000000-0000-4000-8000-00000000abcd', 'FINALIZADA');
      expect(nada.status).toBe(404);
      expect(nada.body.error.code).toBe('ASIGNACION_NOT_FOUND');
    });
  });

  describe('GET /asignaciones', () => {
    it('lista paginada con filtros por estado y tutor', async () => {
      const recLaura = await recomendar(IDS.solicitudLaura);
      const a1 = (await confirmar({ recomendacionId: recLaura.id, tutorId: IDS.ana })).body.data;
      const recMateo = await recomendar(IDS.solicitudMateo);
      const a2 = (
        await confirmar({ recomendacionId: recMateo.id, tutorId: recMateo.tutorRecomendadoId })
      ).body.data;
      await e.request.patch(`/api/v1/asignaciones/${a1.id}`).send({ estado: 'FINALIZADA' });

      const todas = await e.request.get('/api/v1/asignaciones');
      expect(todas.status).toBe(200);
      const pagina = pageEnvelope(Asignacion).parse(todas.body);
      expect(pagina.meta).toEqual({ page: 1, pageSize: 20, total: 2 });
      expect(pagina.data.map((a) => a.id)).toEqual([a2.id, a1.id]); // más reciente primero

      const activas = await e.request.get('/api/v1/asignaciones?estado=ACTIVA');
      expect(activas.body.data.map((a: { id: string }) => a.id)).toEqual([a2.id]);

      const porTutor = await e.request.get(`/api/v1/asignaciones?tutorId=${IDS.ana}&pageSize=1`);
      expect(porTutor.body.meta.total).toBe(a2.tutorId === IDS.ana ? 2 : 1);
      expect(porTutor.body.data).toHaveLength(1);

      expect((await e.request.get('/api/v1/asignaciones?estado=PAUSADA')).status).toBe(400);
    });

    it('una asignación sin recomendación toma el nombre del tutor de TutoresPort', async () => {
      await ocuparCupo(e.db, IDS.carla);
      const res = await e.request.get('/api/v1/asignaciones');
      expect(res.body.data[0]).toMatchObject({
        tutorNombre: 'Carla Gómez',
        estudianteNombre: '—',
        materiaNombre: '—',
      });
      expect(res.body.data[0].score).toBeUndefined();
    });
  });
});
