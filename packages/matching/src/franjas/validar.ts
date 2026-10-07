import type { FranjaHoraria } from '@tutorias/contracts/matching';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:mm" → minutos desde las 00:00. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

/** `dia` entero 1–7, horas "HH:mm" válidas y `fin > inicio` (no cruza medianoche). */
export function validarFranja(f: FranjaHoraria): boolean {
  return (
    Number.isInteger(f.dia) &&
    f.dia >= 1 &&
    f.dia <= 7 &&
    HORA.test(f.inicio) &&
    HORA.test(f.fin) &&
    aMinutos(f.fin) > aMinutos(f.inicio)
  );
}

export function duracionMin(f: FranjaHoraria): number {
  return aMinutos(f.fin) - aMinutos(f.inicio);
}
