import type { EvaluadorCriterio } from './tipos';

/** 1 − asignacionesActivas / capacidadMaxima (balance de carga, S-11). */
export const evaluarCarga: EvaluadorCriterio = (tutor) => {
  const valor = Math.max(0, 1 - tutor.asignacionesActivas / tutor.capacidadMaxima);
  const ocupacion = `${tutor.asignacionesActivas} de ${tutor.capacidadMaxima}`;
  return {
    valor,
    evidencia: `tiene cupo (${ocupacion} asignaciones activas)`,
    frase: `tiene cupo (${ocupacion})`,
  };
};
