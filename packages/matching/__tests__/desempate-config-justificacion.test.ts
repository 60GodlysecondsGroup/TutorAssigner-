import { describe, expect, it } from 'vitest';
import { JUSTIFICACION_MAX, type TutorCandidato } from '@tutorias/contracts/matching';
import { diagnosticarConfig, evaluar, validarConfig } from '../src';
import { compararCandidatos, reglaDecisiva } from '../src/desempate';
import { justificarSinCandidatos } from '../src/justificacion';
import { config, solicitud, tutor, uid } from './helpers';

describe('desempate determinista', () => {
  const base = {
    tutorId: uid(5),
    score: 80,
    nivelPrioridad: 3,
    asignacionesActivas: 1,
    minutosCompartidos: 120,
  };

  it.each([
    ['score', { score: 81 }],
    ['prioridad', { nivelPrioridad: 4 }],
    ['carga', { asignacionesActivas: 0 }],
    ['horario', { minutosCompartidos: 180 }],
    ['tutorId', { tutorId: uid(1) }],
  ] as const)('gana por %s', (regla, mejora) => {
    const mejor = { ...base, ...mejora };
    expect(reglaDecisiva(mejor, base)).toBe(regla);
    expect(compararCandidatos(mejor, base)).toBeLessThan(0);
    expect(compararCandidatos(base, mejor)).toBeGreaterThan(0);
  });

  it('el orden de las reglas se respeta (score antes que prioridad, etc.)', () => {
    expect(
      compararCandidatos({ ...base, score: 81, nivelPrioridad: 1 }, { ...base, nivelPrioridad: 5 }),
    ).toBeLessThan(0);
    expect(compararCandidatos(base, base)).toBe(0);
  });

  // Con pesos que anulan un criterio se fuerzan empates reales de score dentro de evaluar().
  const sinPeso = (criterio: 'prioridad' | 'carga' | 'horario') =>
    config({
      pesos: {
        dominio: 0.5,
        horario: criterio === 'horario' ? 0 : 0.25,
        prioridad: criterio === 'prioridad' ? 0 : 0.25,
        preferencias: 0,
        carga: criterio === 'carga' ? 0 : 0.25,
      },
    });

  it.each([
    ['prioridad', 'mayor prioridad', { nivelPrioridad: 5 }],
    ['carga', 'menos asignaciones activas', { asignacionesActivas: 0 }],
    ['horario', 'compartir más horario', { franjas: [{ dia: 2, inicio: '14:00', fin: '17:00' }] }],
  ] as [Parameters<typeof sinPeso>[0], string, Partial<TutorCandidato>][])(
    'en evaluar(): empate de score resuelto por %s',
    (criterio, razon, ventaja) => {
      const normal = tutor(1, { asignacionesActivas: 1 });
      const favorecido = tutor(9, { asignacionesActivas: 1, ...ventaja });
      const r = evaluar(solicitud(), [normal, favorecido], sinPeso(criterio));
      expect(r.recomendado?.score).toBe(r.alternativas[0]?.score);
      expect(r.recomendado?.tutorId).toBe(uid(9));
      expect(r.justificacion).toContain(razon);
    },
  );
});

describe('validarConfig', () => {
  it('acepta la configuración v1', () => expect(validarConfig(config())).toBe(true));

  it('acepta una suma dentro de la tolerancia ε = 0,001', () => {
    expect(
      validarConfig(
        config({
          pesos: { dominio: 0.3005, horario: 0.25, prioridad: 0.2, preferencias: 0.15, carga: 0.1 },
        }),
      ),
    ).toBe(true);
  });

  it('rechaza pesos que no suman 1', () => {
    const c = config({
      pesos: { dominio: 0.5, horario: 0.25, prioridad: 0.2, preferencias: 0.15, carga: 0.1 },
    });
    expect(validarConfig(c)).toBe(false);
    expect(diagnosticarConfig(c)).toEqual([
      { path: 'pesos', message: 'Los pesos deben sumar 1 (suman 1.2)' },
    ]);
  });

  it('rechaza pesos negativos y parámetros < 1', () => {
    const c = config({
      pesos: { dominio: -0.1, horario: 0.35, prioridad: 0.3, preferencias: 0.3, carga: 0.15 },
      parametros: { topN: 0, bloquesHorarioIdeal: 0 },
    });
    expect(diagnosticarConfig(c).map((p) => p.path)).toEqual([
      'pesos.dominio',
      'parametros.topN',
      'parametros.bloquesHorarioIdeal',
    ]);
  });
});

describe('justificación', () => {
  it('nombra primero la evidencia del criterio de mayor aporte', () => {
    const r = evaluar(
      solicitud(),
      [tutor(1, { nivelPrioridad: 5, nivelDominio: 1 })],
      config({
        pesos: { dominio: 0.1, horario: 0.1, prioridad: 0.6, preferencias: 0.1, carga: 0.1 },
      }),
    );
    expect(r.justificacion).toMatch(/^Tutor 1 \([\d,]+\/100\): tiene prioridad 5\/5/);
  });

  it('nunca supera 280 caracteres aunque el nombre y la materia sean largos', () => {
    const largo = 'Nombre Extremadamente Largo '.repeat(8).trim();
    const r = evaluar(
      solicitud({
        materiaNombre: 'Materia '.repeat(20).trim(),
        preferencias: { modalidad: 'VIRTUAL' },
      }),
      [tutor(1, { nombre: largo, nivelDominio: 5 }), tutor(2, { nombre: largo })],
      config(),
    );
    expect(r.justificacion.length).toBeLessThanOrEqual(JUSTIFICACION_MAX);
    expect(r.justificacion.startsWith(largo.slice(0, 30))).toBe(true);
  });

  it('usa "punto" en singular cuando la diferencia es 1', () => {
    const r = evaluar(
      solicitud(),
      [tutor(1, { nivelDominio: 4 }), tutor(2, { nivelDominio: 3 })],
      config({
        pesos: { dominio: 0.05, horario: 0.25, prioridad: 0.3, preferencias: 0.2, carga: 0.2 },
      }),
    );
    expect(r.justificacion).toContain('por 1 punto, sobre todo en dominio de la materia.');
  });

  it('sin candidatos: cuenta los descartados por motivo', () => {
    expect(
      justificarSinCandidatos(4, [
        { tutorId: uid(1), motivos: ['SIN_HORARIO_COMPATIBLE'] },
        { tutorId: uid(2), motivos: ['SIN_HORARIO_COMPATIBLE'] },
        { tutorId: uid(3), motivos: ['SIN_HORARIO_COMPATIBLE'] },
        { tutorId: uid(4), motivos: ['SIN_CUPO'] },
      ]),
    ).toBe('No hay tutores elegibles: 3 sin horario compatible, 1 sin cupo.');
  });
});
