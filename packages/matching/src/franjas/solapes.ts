import type { FranjaHoraria } from '@tutorias/contracts/matching';
import { aMinutos } from './validar';

/**
 * `true` si están en el mismo día y sus intervalos se intersecan con duración positiva.
 * Franjas que solo se tocan (14:00–15:00 y 15:00–16:00) NO se solapan.
 */
export function haySolape(a: FranjaHoraria, b: FranjaHoraria): boolean {
  if (a.dia !== b.dia) return false;
  return (
    Math.max(aMinutos(a.inicio), aMinutos(b.inicio)) < Math.min(aMinutos(a.fin), aMinutos(b.fin))
  );
}

/** Pares de índices `[i, j]` (i < j) de franjas que se solapan entre sí. Vacío si no hay solapes. */
export function detectarSolapes(franjas: FranjaHoraria[]): [number, number][] {
  const pares: [number, number][] = [];
  for (let i = 0; i < franjas.length; i++) {
    for (let j = i + 1; j < franjas.length; j++) {
      if (haySolape(franjas[i]!, franjas[j]!)) pares.push([i, j]);
    }
  }
  return pares;
}
