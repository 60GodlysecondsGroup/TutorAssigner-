/** Tests unitarios (sin BD): adaptadores, fakes y mapper. */
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { tutorParaMatchingValido } from '@tutorias/contracts/tutores/fixtures';
import { evaluar } from '@tutorias/matching';
import { configV1 } from '@tutorias/contracts/matching/fixtures';
import { AppError } from '../../../platform/http';
import type { Trx } from '../../../platform/db';
import { createSolicitudesAdapter } from '../adapters/solicitudes.adapter';
import { createTutoresAdapter } from '../adapters/tutores.adapter';
import { IDS, MATERIA_CALCULO, solicitudesDemo, tutoresDemo } from '../fakes/datos';
import { createSolicitudesFake } from '../fakes/solicitudes.fake';
import { createTutoresFake } from '../fakes/tutores.fake';
import {
  toRecomendacion,
  type CandidatoRow,
  type EntradaSnapshot,
} from '../recomendaciones.mapper';
import { aSolicitudMatching } from '../recomendaciones.service';

const trx = {} as Trx;

describe('adaptador de Tutores', () => {
  it('valida la respuesta contra el contrato TutorParaMatching', async () => {
    const ok = createTutoresAdapter({
      listarCandidatos: async () => [tutorParaMatchingValido],
      obtenerResumenes: async () => [],
    });
    await expect(ok.listarCandidatos(MATERIA_CALCULO)).resolves.toEqual([tutorParaMatchingValido]);

    const roto = createTutoresAdapter({
      listarCandidatos: async () => [{ ...tutorParaMatchingValido, nivelDominio: 9 }],
      obtenerResumenes: async () => [],
    });
    await expect(roto.listarCandidatos(MATERIA_CALCULO)).rejects.toBeInstanceOf(ZodError);
  });

  it('no llama al proveedor con una lista vacía de ids', async () => {
    let llamadas = 0;
    const adapter = createTutoresAdapter({
      listarCandidatos: async () => [],
      obtenerResumenes: async () => {
        llamadas++;
        return [];
      },
    });
    await expect(adapter.obtenerResumenes([])).resolves.toEqual([]);
    expect(llamadas).toBe(0);
  });

  it('propaga el 501 mientras Tutores sea un stub', async () => {
    const adapter = createTutoresAdapter({
      listarCandidatos: async () => {
        throw AppError.notImplemented();
      },
      obtenerResumenes: async () => [],
    });
    await expect(adapter.listarCandidatos(MATERIA_CALCULO)).rejects.toMatchObject({ status: 501 });
  });
});

describe('adaptador de Solicitudes', () => {
  const [solicitud] = solicitudesDemo();

  it('normaliza un 404 del proveedor a null y valida la forma', async () => {
    const adapter = createSolicitudesAdapter({
      obtenerParaMatching: async (id) => {
        if (id === solicitud!.solicitudId) return solicitud;
        throw AppError.notFound('SOLICITUD_NOT_FOUND', 'no');
      },
      marcarAsignada: async () => undefined,
    });
    await expect(adapter.obtenerParaMatching(solicitud!.solicitudId)).resolves.toEqual(solicitud);
    await expect(adapter.obtenerParaMatching(IDS.ana)).resolves.toBeNull();
  });

  it('rechaza una solicitud con forma inválida', async () => {
    const adapter = createSolicitudesAdapter({
      obtenerParaMatching: async () => ({ ...solicitud, estado: 'PAUSADA' }),
      marcarAsignada: async () => undefined,
    });
    await expect(adapter.obtenerParaMatching(solicitud!.solicitudId)).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it('reabrir responde 501 si Solicitudes aún no lo expone', async () => {
    const adapter = createSolicitudesAdapter({
      obtenerParaMatching: async () => null,
      marcarAsignada: async () => undefined,
    });
    await expect(adapter.reabrir(solicitud!.solicitudId, trx)).rejects.toMatchObject({
      status: 501,
    });
  });
});

describe('fakes', () => {
  it('Tutores: solo activos que dictan la materia, con el dominio de esa materia', async () => {
    const fake = createTutoresFake(tutoresDemo());
    fake.actualizar(IDS.carla, { activo: false });
    const ids = (await fake.listarCandidatos(MATERIA_CALCULO)).map((t) => t.tutorId);
    expect(ids).toEqual([IDS.ana, IDS.beto, IDS.diego]);
    expect(await fake.listarCandidatos('00000000-0000-4000-8000-000000000000')).toEqual([]);
    expect((await fake.obtenerResumenes([IDS.carla]))[0]).toMatchObject({ activo: false });
  });

  it('Solicitudes: ABIERTA → ASIGNADA → ABIERTA; transiciones inválidas dan 409', async () => {
    const fake = createSolicitudesFake(solicitudesDemo());
    await fake.marcarAsignada(IDS.solicitudLaura, trx);
    expect(fake.estado(IDS.solicitudLaura)).toBe('ASIGNADA');
    await expect(fake.marcarAsignada(IDS.solicitudLaura, trx)).rejects.toMatchObject({
      status: 409,
    });
    await fake.reabrir(IDS.solicitudLaura, trx);
    expect(fake.estado(IDS.solicitudLaura)).toBe('ABIERTA');
  });
});

describe('mapper de recomendaciones', () => {
  it('ordena candidatos por posición, recorta a topN, añade nombres y separa descartados', async () => {
    const fake = createTutoresFake(tutoresDemo());
    const solicitud = aSolicitudMatching(solicitudesDemo()[0]!);
    const candidatos = (await fake.listarCandidatos(MATERIA_CALCULO)).map((t) => ({
      ...t,
      asignacionesActivas: t.tutorId === IDS.diego ? 1 : 0,
    }));
    const config = { ...configV1, parametros: { ...configV1.parametros, topN: 1 } };
    const resultado = evaluar(solicitud, candidatos, config);
    const snapshot: EntradaSnapshot = {
      solicitud,
      candidatos,
      config,
      contexto: {
        estudianteId: IDS.estudianteLaura,
        estudianteNombre: 'Laura',
        materiaNombre: 'Cálculo I',
      },
    };
    const filas: CandidatoRow[] = [
      ...resultado.descartados.map((d) => ({
        recomendacion_id: 'r',
        tutor_id: d.tutorId,
        elegible: false,
        posicion: null,
        score: null,
        desglose: { motivos: d.motivos },
      })),
      ...[...resultado.ranking].reverse().map((c) => ({
        recomendacion_id: 'r',
        tutor_id: c.tutorId,
        elegible: true,
        posicion: c.posicion,
        score: c.score.toFixed(2),
        desglose: c.desglose,
      })),
    ];
    const dto = toRecomendacion(
      {
        id: '9d8e7f6a-0000-4000-8000-000000000001',
        solicitud_id: solicitud.solicitudId,
        config_id: '5c0f1a2b-0000-4000-8000-000000000001',
        config_version: 1,
        resultado: 'RECOMENDADO',
        tutor_recomendado_id: resultado.recomendado!.tutorId,
        score: resultado.recomendado!.score.toFixed(2),
        justificacion: resultado.justificacion,
        entrada_snapshot: snapshot,
        created_at: new Date('2026-10-07T15:00:00Z'),
      },
      filas,
    );
    expect(dto.candidatos).toEqual([
      expect.objectContaining({ tutorId: IDS.ana, nombre: 'Ana Torres', posicion: 1, score: 96 }),
    ]);
    expect(dto.descartados).toEqual([
      { tutorId: IDS.carla, nombre: 'Carla Gómez', motivos: ['SIN_HORARIO_COMPATIBLE'] },
      { tutorId: IDS.diego, nombre: 'Diego Pardo', motivos: ['SIN_CUPO'] },
    ]);
    expect(dto).toMatchObject({
      score: 96,
      tutorRecomendadoId: IDS.ana,
      createdAt: '2026-10-07T15:00:00.000Z',
    });
  });
});
