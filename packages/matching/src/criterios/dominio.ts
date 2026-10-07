import type { EvaluadorCriterio } from './tipos';

/** nivelDominio / 5 */
export const evaluarDominio: EvaluadorCriterio = (tutor, { solicitud }) => {
  const materia = solicitud.materiaNombre ?? 'la materia';
  const texto = `domina ${materia} (${tutor.nivelDominio}/5)`;
  return { valor: tutor.nivelDominio / 5, evidencia: texto, frase: texto };
};
