import { describe, expect, it } from 'vitest';
import { franjas } from '../src';
import {
  evaluarCarga,
  evaluarDominio,
  evaluarHorario,
  evaluarPreferencias,
  evaluarPrioridad,
  type ContextoEvaluacion,
} from '../src/criterios';
import { config, solicitud, tutor, uid } from './helpers';

function ctx(over: Partial<ContextoEvaluacion> = {}, t = tutor(1)): ContextoEvaluacion {
  const s = over.solicitud ?? solicitud();
  const bloques = franjas.intersecciones(s.franjas, t.franjas);
  return {
    solicitud: s,
    config: config(),
    bloques,
    minutosCompartidos: franjas.minutosCompartidos(s.franjas, t.franjas),
    ...over,
  };
}

describe('criterio dominio', () => {
  it.each([1, 3, 5] as const)('nivel %i → %i/5', (nivel) => {
    const r = evaluarDominio(tutor(1, { nivelDominio: nivel }), ctx());
    expect(r.valor).toBe(nivel / 5);
    expect(r.evidencia).toBe(`domina Cálculo I (${nivel}/5)`);
  });

  it('sin nombre de materia usa un texto genérico', () => {
    const s = solicitud({ materiaNombre: undefined });
    expect(evaluarDominio(tutor(1), ctx({ solicitud: s })).evidencia).toBe(
      'domina la materia (3/5)',
    );
  });
});

describe('criterio horario', () => {
  it('min(1, compartidos / (bloquesIdeal × duración))', () => {
    expect(evaluarHorario(tutor(1), ctx({ minutosCompartidos: 90 })).valor).toBeCloseTo(0.5);
    expect(evaluarHorario(tutor(1), ctx({ minutosCompartidos: 600 })).valor).toBe(1);
    expect(evaluarHorario(tutor(1), ctx({ minutosCompartidos: 0, bloques: [] })).valor).toBe(0);
  });

  it('la evidencia lista hasta 3 bloques y resume el resto', () => {
    const bloques = [1, 2, 3, 4, 5].map((dia) => ({ dia, inicio: '10:00', fin: '11:00' }));
    const r = evaluarHorario(tutor(1), ctx({ bloques, minutosCompartidos: 300 }));
    expect(r.evidencia).toBe(
      'comparte 5 h: lun 10:00–11:00, mar 10:00–11:00, mié 10:00–11:00 y 2 más',
    );
    expect(r.frase).toBe('comparte 5 h con tu disponibilidad');
  });
});

describe('criterio prioridad', () => {
  it('nivelPrioridad / 5', () => {
    expect(evaluarPrioridad(tutor(1, { nivelPrioridad: 5 }), ctx())).toEqual({
      valor: 1,
      evidencia: 'prioridad 5/5 por experiencia',
      frase: 'tiene prioridad 5/5',
    });
  });
});

describe('criterio preferencias', () => {
  const conPrefs = (preferencias: object) => ctx({ solicitud: solicitud({ preferencias }) });

  it('sin preferencias → 1 y no aporta frase a la justificación', () => {
    expect(evaluarPreferencias(tutor(1), conPrefs({}))).toEqual({
      valor: 1,
      evidencia: 'sin preferencias declaradas',
      frase: null,
    });
  });

  it('modalidad: AMBAS o igual cumple; distinta no', () => {
    expect(
      evaluarPreferencias(tutor(1, { modalidad: 'AMBAS' }), conPrefs({ modalidad: 'VIRTUAL' }))
        .valor,
    ).toBe(1);
    expect(
      evaluarPreferencias(tutor(1, { modalidad: 'VIRTUAL' }), conPrefs({ modalidad: 'VIRTUAL' }))
        .valor,
    ).toBe(1);
    const no = evaluarPreferencias(
      tutor(1, { modalidad: 'PRESENCIAL' }),
      conPrefs({ modalidad: 'VIRTUAL' }),
    );
    expect(no).toEqual({ valor: 0, evidencia: 'no atiende virtual', frase: null });
  });

  it('cumplidas / declaradas con tutor preferido', () => {
    const r = evaluarPreferencias(
      tutor(1, { modalidad: 'PRESENCIAL' }),
      conPrefs({ modalidad: 'VIRTUAL', tutorPreferidoId: uid(1) }),
    );
    expect(r.valor).toBe(0.5);
    expect(r.evidencia).toBe('es el tutor que pediste; no atiende virtual');
    expect(r.frase).toBe('es el tutor que pediste');
    expect(evaluarPreferencias(tutor(2), conPrefs({ tutorPreferidoId: uid(1) })).valor).toBe(0);
  });
});

describe('criterio carga', () => {
  it('1 − activas / capacidad', () => {
    expect(
      evaluarCarga(tutor(1, { asignacionesActivas: 0, capacidadMaxima: 4 }), ctx()).valor,
    ).toBe(1);
    expect(
      evaluarCarga(tutor(1, { asignacionesActivas: 1, capacidadMaxima: 4 }), ctx()).valor,
    ).toBe(0.75);
    const r = evaluarCarga(tutor(1, { asignacionesActivas: 2, capacidadMaxima: 3 }), ctx());
    expect(r.evidencia).toBe('tiene cupo (2 de 3 asignaciones activas)');
  });

  it('nunca es negativo aunque los datos excedan la capacidad', () => {
    expect(
      evaluarCarga(tutor(1, { asignacionesActivas: 5, capacidadMaxima: 3 }), ctx()).valor,
    ).toBe(0);
  });
});
