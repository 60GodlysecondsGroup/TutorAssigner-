import { formatearDuracion, formatearFranja } from '../franjas';
import type { EvaluadorCriterio } from './tipos';

const BLOQUES_EN_EVIDENCIA = 3;

/** min(1, minutosCompartidos / (bloquesHorarioIdeal × duracionSesionMin)) */
export const evaluarHorario: EvaluadorCriterio = (_tutor, ctx) => {
  const ideal = ctx.config.parametros.bloquesHorarioIdeal * ctx.solicitud.duracionSesionMin;
  const valor = ideal > 0 ? Math.min(1, ctx.minutosCompartidos / ideal) : 0;
  const total = formatearDuracion(ctx.minutosCompartidos);

  const visibles = ctx.bloques.slice(0, BLOQUES_EN_EVIDENCIA).map(formatearFranja).join(', ');
  const resto = ctx.bloques.length - BLOQUES_EN_EVIDENCIA;
  const evidencia =
    ctx.bloques.length === 0
      ? 'no comparte horario'
      : `comparte ${total}: ${visibles}${resto > 0 ? ` y ${resto} más` : ''}`;

  return { valor, evidencia, frase: `comparte ${total} con tu disponibilidad` };
};
