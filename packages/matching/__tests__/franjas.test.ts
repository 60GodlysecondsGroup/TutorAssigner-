import { describe, expect, it } from 'vitest';
import {
  bloquesContinuos,
  detectarSolapes,
  formatearDuracion,
  haySolape,
  intersecciones,
  minutosCompartidos,
  tieneBloqueSuficiente,
  validarFranja,
} from '../src/franjas';

const f = (dia: number, inicio: string, fin: string) => ({ dia, inicio, fin });

describe('validarFranja', () => {
  it('franja válida (lun 09:00–10:00)', () =>
    expect(validarFranja(f(1, '09:00', '10:00'))).toBe(true));
  it('fin <= inicio es inválida', () => {
    expect(validarFranja(f(1, '10:00', '10:00'))).toBe(false);
    expect(validarFranja(f(1, '23:00', '01:00'))).toBe(false); // cruzaría medianoche
  });
  it('día fuera de rango o no entero', () => {
    expect(validarFranja(f(0, '09:00', '10:00'))).toBe(false);
    expect(validarFranja(f(8, '09:00', '10:00'))).toBe(false);
    expect(validarFranja(f(1.5, '09:00', '10:00'))).toBe(false);
  });
  it('formato de hora inválido', () => {
    expect(validarFranja(f(1, '9:00', '10:00'))).toBe(false);
    expect(validarFranja(f(1, '09:00', '24:00'))).toBe(false);
  });
});

describe('haySolape / detectarSolapes', () => {
  it('mismo día y se intersecan → true', () => {
    expect(haySolape(f(2, '14:00', '16:00'), f(2, '15:00', '17:00'))).toBe(true);
    expect(haySolape(f(2, '14:00', '18:00'), f(2, '15:00', '16:00'))).toBe(true); // contenida
  });
  it('contiguas sin solape → false', () => {
    expect(haySolape(f(2, '14:00', '15:00'), f(2, '15:00', '16:00'))).toBe(false);
  });
  it('distinto día → false', () => {
    expect(haySolape(f(2, '14:00', '16:00'), f(3, '14:00', '16:00'))).toBe(false);
  });
  it('detecta todos los pares que se solapan', () => {
    const lista = [
      f(1, '08:00', '10:00'),
      f(1, '09:00', '11:00'),
      f(1, '10:00', '12:00'),
      f(2, '08:00', '10:00'),
    ];
    expect(detectarSolapes(lista)).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(detectarSolapes([f(1, '08:00', '09:00'), f(1, '09:00', '10:00')])).toEqual([]);
  });
});

describe('minutos compartidos y bloques', () => {
  const estudiante = [f(2, '14:00', '17:00'), f(4, '15:00', '17:00')];
  const tutor = [f(2, '15:00', '16:30'), f(4, '16:15', '20:00'), f(5, '09:00', '12:00')];

  it('intersecciones ordenadas por día e inicio', () => {
    expect(intersecciones(tutor, estudiante)).toEqual([
      f(2, '15:00', '16:30'),
      f(4, '16:15', '17:00'),
    ]);
  });

  it('minutosCompartidos suma todas las intersecciones', () => {
    expect(minutosCompartidos(estudiante, tutor)).toBe(90 + 45);
    expect(minutosCompartidos(estudiante, [])).toBe(0);
  });

  it('bloquesContinuos cuenta bloques ≥ duración', () => {
    expect(bloquesContinuos(estudiante, tutor, 45)).toBe(2);
    expect(bloquesContinuos(estudiante, tutor, 60)).toBe(1);
    expect(bloquesContinuos(estudiante, tutor, 120)).toBe(0);
  });

  it('tieneBloqueSuficiente: duración 60 con bloque de 45 → false; con bloque de 90 → true', () => {
    expect(tieneBloqueSuficiente([f(1, '10:00', '10:45')], [f(1, '09:00', '12:00')], 60)).toBe(
      false,
    );
    expect(tieneBloqueSuficiente([f(1, '10:00', '11:30')], [f(1, '09:00', '12:00')], 60)).toBe(
      true,
    );
  });

  it('formatearDuracion', () => {
    expect(formatearDuracion(180)).toBe('3 h');
    expect(formatearDuracion(90)).toBe('1 h 30 min');
    expect(formatearDuracion(45)).toBe('45 min');
  });
});
