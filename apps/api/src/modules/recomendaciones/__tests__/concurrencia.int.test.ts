/**
 * Concurrencia real contra PostgreSQL (DoD F7): dos confirmaciones simultáneas producen un 201 y
 * un 409, nunca dos asignaciones ni sobrecupo.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestDb } from '../../../../test/helpers';
import { IDS, MATERIA_CALCULO, solicitudesDemo } from '../fakes/datos';
import type { TutorFake } from '../fakes/tutores.fake';
import { crearEntorno, limpiar, sembrarConfigV1, type Entorno } from './support';

const RONDAS = 5;

const zoe: TutorFake = {
  tutorId: 'f4000000-0000-4000-8000-000000000099',
  nombre: 'Zoe Ramos',
  email: 'zoe@tutorias.test',
  nivelPrioridad: 5,
  modalidad: 'AMBAS',
  capacidadMaxima: 1,
  activo: true,
  materias: { [MATERIA_CALCULO]: 5 },
  franjas: [
    { dia: 2, inicio: '14:00', fin: '17:00' },
    { dia: 4, inicio: '15:00', fin: '17:00' },
  ],
};

describe('concurrencia de confirmaciones', () => {
  let e: Entorno;

  afterAll(async () => {
    await closeTestDb();
  });

  const preparar = async (opciones?: Parameters<typeof crearEntorno>[0]) => {
    e = await crearEntorno(opciones);
    await limpiar(e.db);
    await sembrarConfigV1(e.db);
  };
  const recomendar = async (solicitudId: string) =>
    (await e.request.post('/api/v1/recomendaciones').send({ solicitudId })).body.data;
  const confirmar = (body: object) => e.request.post('/api/v1/asignaciones').send(body);

  beforeEach(async () => {
    await preparar();
  });

  it.each(Array.from({ length: RONDAS }, (_, i) => i + 1))(
    'misma solicitud, dos confirmaciones simultáneas → un 201 y un 409 SOLICITUD_YA_ASIGNADA (ronda %i)',
    async () => {
      const rec = await recomendar(IDS.solicitudLaura);
      const [a, b] = await Promise.all([
        confirmar({ recomendacionId: rec.id, tutorId: IDS.ana }),
        confirmar({ recomendacionId: rec.id, tutorId: IDS.beto, motivoCambio: 'preferencia' }),
      ]);
      const estados = [a.status, b.status].sort();
      expect(estados).toEqual([201, 409]);
      expect([a, b].find((r) => r.status === 409)!.body.error.code).toBe('SOLICITUD_YA_ASIGNADA');
      const activas = await e
        .db('asignaciones')
        .where({ solicitud_id: IDS.solicitudLaura, estado: 'ACTIVA' });
      expect(activas).toHaveLength(1);
    },
  );

  it.each(Array.from({ length: RONDAS }, (_, i) => i + 1))(
    'mismo tutor al límite de cupo, dos solicitudes simultáneas → un 201 y un 409 SIN_CUPO_TUTOR (ronda %i)',
    async () => {
      const [laura, mateo] = solicitudesDemo();
      await preparar({
        tutores: [zoe],
        solicitudes: [laura!, { ...mateo!, franjas: laura!.franjas }],
      });
      const recA = await recomendar(laura!.solicitudId);
      const recB = await recomendar(mateo!.solicitudId);
      expect([recA.tutorRecomendadoId, recB.tutorRecomendadoId]).toEqual([
        zoe.tutorId,
        zoe.tutorId,
      ]);

      const [a, b] = await Promise.all([
        confirmar({ recomendacionId: recA.id, tutorId: zoe.tutorId }),
        confirmar({ recomendacionId: recB.id, tutorId: zoe.tutorId }),
      ]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
      expect([a, b].find((r) => r.status === 409)!.body.error.code).toBe('SIN_CUPO_TUTOR');
      const activas = await e.db('asignaciones').where({ tutor_id: zoe.tutorId, estado: 'ACTIVA' });
      expect(activas).toHaveLength(1);
    },
  );
});
