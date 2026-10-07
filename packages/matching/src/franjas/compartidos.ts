import type { FranjaHoraria } from '@tutorias/contracts/matching';
import { aMinutos, duracionMin } from './validar';

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Intersecciones (duración > 0) entre dos conjuntos de franjas, ordenadas por día e inicio.
 * Cada intersección es un bloque continuo. Se asume que las franjas de un mismo conjunto no se
 * solapan (lo validan Tutores y Solicitudes); las que solo se tocan son bloques separados.
 */
export function intersecciones(a: FranjaHoraria[], b: FranjaHoraria[]): FranjaHoraria[] {
  const bloques: FranjaHoraria[] = [];
  for (const fa of a) {
    for (const fb of b) {
      if (fa.dia !== fb.dia) continue;
      const inicio = Math.max(aMinutos(fa.inicio), aMinutos(fb.inicio));
      const fin = Math.min(aMinutos(fa.fin), aMinutos(fb.fin));
      if (fin > inicio) bloques.push({ dia: fa.dia, inicio: aHora(inicio), fin: aHora(fin) });
    }
  }
  return bloques.sort((x, y) => x.dia - y.dia || aMinutos(x.inicio) - aMinutos(y.inicio));
}

/** Total de minutos de intersección entre dos conjuntos de franjas. */
export function minutosCompartidos(a: FranjaHoraria[], b: FranjaHoraria[]): number {
  return intersecciones(a, b).reduce((total, f) => total + duracionMin(f), 0);
}

/** Cantidad de bloques continuos compartidos de al menos `duracionMin` minutos. */
export function bloquesContinuos(a: FranjaHoraria[], b: FranjaHoraria[], duracion: number): number {
  return intersecciones(a, b).filter((f) => duracionMin(f) >= duracion).length;
}

/** `true` si comparten al menos un bloque continuo de `duracionMin` minutos. */
export function tieneBloqueSuficiente(
  a: FranjaHoraria[],
  b: FranjaHoraria[],
  duracion: number,
): boolean {
  return bloquesContinuos(a, b, duracion) >= 1;
}
