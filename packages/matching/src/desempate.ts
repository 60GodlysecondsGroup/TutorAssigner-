/** Datos que usa el desempate determinista (Paso 3). */
export type Ordenable = {
  tutorId: string;
  score: number;
  nivelPrioridad: number;
  asignacionesActivas: number;
  minutosCompartidos: number;
};

export type CriterioDesempate = 'score' | 'prioridad' | 'carga' | 'horario' | 'tutorId';

/** Qué regla decidió el orden entre `a` y `b` (para la justificación). */
export function reglaDecisiva(a: Ordenable, b: Ordenable): CriterioDesempate {
  if (a.score !== b.score) return 'score';
  if (a.nivelPrioridad !== b.nivelPrioridad) return 'prioridad';
  if (a.asignacionesActivas !== b.asignacionesActivas) return 'carga';
  if (a.minutosCompartidos !== b.minutosCompartidos) return 'horario';
  return 'tutorId';
}

/**
 * Comparador: score ↓, prioridad ↓, asignaciones activas ↑, minutos compartidos ↓, tutorId ↑.
 * Sin reloj ni azar: mismo input, mismo orden.
 */
export function compararCandidatos(a: Ordenable, b: Ordenable): number {
  switch (reglaDecisiva(a, b)) {
    case 'score':
      return b.score - a.score;
    case 'prioridad':
      return b.nivelPrioridad - a.nivelPrioridad;
    case 'carga':
      return a.asignacionesActivas - b.asignacionesActivas;
    case 'horario':
      return b.minutosCompartidos - a.minutosCompartidos;
    case 'tutorId':
      return a.tutorId < b.tutorId ? -1 : a.tutorId > b.tutorId ? 1 : 0;
  }
}
