import type { EvaluadorCriterio } from './tipos';

/** nivelPrioridad / 5 (los tutores con más experiencia pesan más, RC-03). */
export const evaluarPrioridad: EvaluadorCriterio = (tutor) => ({
  valor: tutor.nivelPrioridad / 5,
  evidencia: `prioridad ${tutor.nivelPrioridad}/5 por experiencia`,
  frase: `tiene prioridad ${tutor.nivelPrioridad}/5`,
});
