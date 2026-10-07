import type { EvaluadorCriterio } from './tipos';

/** Preferencias cumplidas / declaradas; sin preferencias declaradas el valor es 1. */
export const evaluarPreferencias: EvaluadorCriterio = (tutor, { solicitud }) => {
  const { modalidad, tutorPreferidoId } = solicitud.preferencias;
  const cumplidas: string[] = [];
  const incumplidas: string[] = [];

  if (modalidad) {
    const texto = modalidad.toLowerCase();
    if (tutor.modalidad === 'AMBAS' || tutor.modalidad === modalidad) {
      cumplidas.push(`atiende ${texto}, como pediste`);
    } else {
      incumplidas.push(`no atiende ${texto}`);
    }
  }
  if (tutorPreferidoId) {
    if (tutor.tutorId === tutorPreferidoId) cumplidas.push('es el tutor que pediste');
    else incumplidas.push('no es el tutor que pediste');
  }

  const declaradas = cumplidas.length + incumplidas.length;
  if (declaradas === 0) {
    return { valor: 1, evidencia: 'sin preferencias declaradas', frase: null };
  }
  return {
    valor: cumplidas.length / declaradas,
    evidencia: [...cumplidas, ...incumplidas].join('; '),
    frase: cumplidas.length > 0 ? cumplidas.join(' y ') : null,
  };
};
