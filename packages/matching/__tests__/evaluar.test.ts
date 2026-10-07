/** Casos dorados del motor (SPEC-Motor-Matching, sección Pruebas). */
import { describe, expect, it } from 'vitest';
import { ResultadoMatching } from '@tutorias/contracts/matching';
import { evaluar } from '../src';
import { config, solicitud, tutor, uid } from './helpers';

const ana = tutor(1, {
  nombre: 'Ana Torres',
  nivelDominio: 5,
  nivelPrioridad: 4,
  franjas: [
    { dia: 2, inicio: '14:00', fin: '16:00' },
    { dia: 4, inicio: '15:00', fin: '18:00' },
  ],
  asignacionesActivas: 1,
});
const beto = tutor(2, {
  nombre: 'Beto Ruiz',
  nivelDominio: 4,
  nivelPrioridad: 5,
  modalidad: 'VIRTUAL',
  franjas: [{ dia: 2, inicio: '16:00', fin: '17:00' }],
  capacidadMaxima: 2,
});

describe('evaluar — casos dorados', () => {
  it('ejemplo resuelto a mano: score, desglose, ranking y justificación', () => {
    const r = evaluar(solicitud({ preferencias: { modalidad: 'VIRTUAL' } }), [beto, ana], config());
    expect(ResultadoMatching.parse(r)).toEqual(r);
    expect(r.resultado).toBe('RECOMENDADO');

    // Ana: dominio 5/5→30 · horario 240 min ≥ 3×60 → 25 · prioridad 4/5→16 · preferencias 1→15
    //      · carga 1−1/3→6,67  ⇒ 92,67 → 92,7
    expect(r.recomendado).toMatchObject({ tutorId: ana.tutorId, posicion: 1, score: 92.7 });
    expect(r.recomendado!.desglose).toEqual([
      { criterio: 'dominio', valor: 1, peso: 0.3, aporte: 30, evidencia: 'domina Cálculo I (5/5)' },
      {
        criterio: 'horario',
        valor: 1,
        peso: 0.25,
        aporte: 25,
        evidencia: 'comparte 4 h: mar 14:00–16:00, jue 15:00–17:00',
      },
      {
        criterio: 'prioridad',
        valor: 0.8,
        peso: 0.2,
        aporte: 16,
        evidencia: 'prioridad 4/5 por experiencia',
      },
      {
        criterio: 'preferencias',
        valor: 1,
        peso: 0.15,
        aporte: 15,
        evidencia: 'atiende virtual, como pediste',
      },
      {
        criterio: 'carga',
        valor: 0.6667,
        peso: 0.1,
        aporte: 6.67,
        evidencia: 'tiene cupo (1 de 3 asignaciones activas)',
      },
    ]);

    // Beto: 24 + 60/180·25 (8,33) + 20 + 15 + 10 = 77,33 → 77,3
    expect(r.alternativas).toEqual([
      expect.objectContaining({ tutorId: beto.tutorId, posicion: 2, score: 77.3 }),
    ]);
    expect(r.justificacion).toBe(
      'Ana Torres (92,7/100): domina Cálculo I (5/5), comparte 4 h con tu disponibilidad y tiene ' +
        'prioridad 4/5. Supera a la segunda opción por 15,4 puntos, sobre todo en horario.',
    );
    expect(r.configVersion).toBe(1);
  });

  it('1 · sin candidatos (array vacío) → SIN_CANDIDATOS con justificación informativa', () => {
    const r = evaluar(solicitud(), [], config());
    expect(r).toMatchObject({
      resultado: 'SIN_CANDIDATOS',
      alternativas: [],
      ranking: [],
      descartados: [],
    });
    expect(r.recomendado).toBeUndefined();
    expect(r.justificacion).toMatch(/no hay candidatos/i);
  });

  it('2 · un solo candidato elegible → posición 1 y sin alternativas', () => {
    const r = evaluar(solicitud(), [tutor(1)], config());
    expect(r.recomendado?.posicion).toBe(1);
    expect(r.alternativas).toEqual([]);
    expect(r.justificacion).not.toMatch(/segunda opción/);
  });

  it('3 · empate de score → desempate determinista (aquí por tutorId)', () => {
    const r = evaluar(solicitud(), [tutor(7), tutor(3)], config());
    expect(r.recomendado?.score).toBe(r.alternativas[0]?.score);
    expect(r.recomendado?.tutorId).toBe(uid(3));
    expect(r.justificacion).toMatch(/Empata en puntaje con la segunda opción/);
  });

  it('4 · tutor sin cupo → descartado SIN_CUPO', () => {
    const r = evaluar(
      solicitud(),
      [tutor(1, { capacidadMaxima: 2, asignacionesActivas: 2 })],
      config(),
    );
    expect(r.descartados).toEqual([{ tutorId: uid(1), motivos: ['SIN_CUPO'] }]);
  });

  it('5 · sin horario compatible → descartado SIN_HORARIO_COMPATIBLE', () => {
    const r = evaluar(
      solicitud(),
      [tutor(1, { franjas: [{ dia: 1, inicio: '08:00', fin: '12:00' }] })],
      config(),
    );
    expect(r.descartados).toEqual([{ tutorId: uid(1), motivos: ['SIN_HORARIO_COMPATIBLE'] }]);
  });

  it('5b · comparte horario pero sin un bloque continuo de la duración → descartado', () => {
    const r = evaluar(
      solicitud({ duracionSesionMin: 90 }),
      [tutor(1, { franjas: [{ dia: 2, inicio: '16:00', fin: '18:00' }] })], // comparte 16–17 (60 min)
      config(),
    );
    expect(r.descartados[0]?.motivos).toEqual(['SIN_HORARIO_COMPATIBLE']);
  });

  it('6 · franjas que se tocan sin solaparse son bloques separados', () => {
    const contiguas = tutor(1, {
      franjas: [
        { dia: 2, inicio: '14:00', fin: '15:00' },
        { dia: 2, inicio: '15:00', fin: '16:00' },
      ],
    });
    // Con 60 min hay dos bloques de 60: elegible y suma 120 min.
    const r60 = evaluar(solicitud(), [contiguas], config());
    expect(r60.recomendado?.desglose.find((c) => c.criterio === 'horario')?.evidencia).toBe(
      'comparte 2 h: mar 14:00–15:00, mar 15:00–16:00',
    );
    // Con 120 min ningún bloque alcanza: no se fusionan.
    const r120 = evaluar(solicitud({ duracionSesionMin: 120 }), [contiguas], config());
    expect(r120.resultado).toBe('SIN_CANDIDATOS');
    // Y una franja del estudiante que termina cuando empieza la del tutor no comparte nada.
    const toca = evaluar(
      solicitud({ franjas: [{ dia: 2, inicio: '12:00', fin: '14:00' }] }),
      [tutor(2)],
      config(),
    );
    expect(toca.descartados[0]?.motivos).toEqual(['SIN_HORARIO_COMPATIBLE']);
  });

  it('7 · solicitud con varias franjas en distintos días suma los minutos compartidos', () => {
    const t = tutor(1, {
      franjas: [
        { dia: 2, inicio: '15:00', fin: '16:30' }, // 90 con mar 14–17
        { dia: 4, inicio: '16:00', fin: '20:00' }, // 60 con jue 15–17
      ],
    });
    const r = evaluar(solicitud(), [t], config());
    const horario = r.recomendado!.desglose.find((c) => c.criterio === 'horario')!;
    expect(horario.evidencia).toBe('comparte 2 h 30 min: mar 15:00–16:30, jue 16:00–17:00');
    expect(horario.valor).toBeCloseTo(150 / 180, 4);
  });

  it('8 · sin preferencias declaradas → criterio preferencias = 1', () => {
    const r = evaluar(
      solicitud({ preferencias: {} }),
      [tutor(1, { modalidad: 'PRESENCIAL' })],
      config(),
    );
    const pref = r.recomendado!.desglose.find((c) => c.criterio === 'preferencias')!;
    expect(pref).toMatchObject({ valor: 1, aporte: 15, evidencia: 'sin preferencias declaradas' });
  });

  it('9 · 5+ candidatos con topN = 3 → 1 recomendado + 2 alternativas; ranking completo', () => {
    const candidatos = [1, 2, 3, 4, 5, 6].map((n) =>
      tutor(n, { nivelDominio: ((n % 5) + 1) as 1 }),
    );
    const r = evaluar(solicitud(), candidatos, config());
    expect(r.alternativas).toHaveLength(2);
    expect(r.ranking).toHaveLength(6);
    expect(r.ranking.map((c) => c.posicion)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(r.alternativas).toEqual(r.ranking.slice(1, 3));
  });

  it('10 · todos descartados con mezcla de motivos → SIN_CANDIDATOS con cada motivo', () => {
    const lejos = [{ dia: 6, inicio: '08:00', fin: '09:00' }];
    const r = evaluar(
      solicitud(),
      [
        tutor(3, { franjas: lejos }),
        tutor(1, { franjas: lejos }),
        tutor(2, { asignacionesActivas: 3 }),
        tutor(4, { franjas: lejos, asignacionesActivas: 5 }),
      ],
      config(),
    );
    expect(r.resultado).toBe('SIN_CANDIDATOS');
    expect(r.descartados).toEqual([
      { tutorId: uid(1), motivos: ['SIN_HORARIO_COMPATIBLE'] },
      { tutorId: uid(2), motivos: ['SIN_CUPO'] },
      { tutorId: uid(3), motivos: ['SIN_HORARIO_COMPATIBLE'] },
      { tutorId: uid(4), motivos: ['SIN_HORARIO_COMPATIBLE', 'SIN_CUPO'] },
    ]);
    expect(r.justificacion).toBe('No hay tutores elegibles: 3 sin horario compatible, 2 sin cupo.');
  });

  it('elegibles y descartados conviven en un mismo resultado', () => {
    const r = evaluar(solicitud(), [tutor(1), tutor(2, { asignacionesActivas: 3 })], config());
    expect(r.recomendado?.tutorId).toBe(uid(1));
    expect(r.descartados).toEqual([{ tutorId: uid(2), motivos: ['SIN_CUPO'] }]);
  });

  it('respeta los pesos de la configuración y su versión', () => {
    const soloDominio = config({
      version: 7,
      pesos: { dominio: 1, horario: 0, prioridad: 0, preferencias: 0, carga: 0 },
    });
    const r = evaluar(
      solicitud(),
      [tutor(1, { nivelDominio: 2 }), tutor(2, { nivelDominio: 4 })],
      soloDominio,
    );
    expect(r.recomendado).toMatchObject({ tutorId: uid(2), score: 80 });
    expect(r.alternativas[0]).toMatchObject({ tutorId: uid(1), score: 40 });
    expect(r.configVersion).toBe(7);
  });
});
