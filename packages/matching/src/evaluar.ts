/**
 * Orquestación del motor: elegibilidad → score ponderado → desempate → justificación.
 * Función pura: no usa reloj, azar ni I/O; el mismo input produce siempre el mismo output.
 * Confía en su entrada (franjas y config ya validadas por el servicio de Recomendaciones).
 */
import type {
  CandidatoEvaluado,
  ConfigMatching,
  CriterioEvaluado,
  CriterioId,
  ResultadoMatching,
  SolicitudMatching,
  TutorCandidato,
} from '@tutorias/contracts/matching';
import { CRITERIOS_V1 } from './criterios';
import { compararCandidatos, reglaDecisiva, type Ordenable } from './desempate';
import { filtrarElegibles, type CandidatoElegible } from './elegibilidad';
import {
  justificarRecomendacion,
  justificarSinCandidatos,
  type EvaluacionParaJustificar,
} from './justificacion';

const redondear = (n: number, decimales: number) => {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
};

type Evaluacion = EvaluacionParaJustificar & Ordenable;

/** Paso 2 — score = 100 × Σ wᵢ·vᵢ, con desglose por criterio. */
function puntuar(
  e: CandidatoElegible,
  solicitud: SolicitudMatching,
  config: ConfigMatching,
): Evaluacion {
  const ctx = {
    solicitud,
    config,
    bloques: e.bloques,
    minutosCompartidos: e.minutosCompartidos,
  };
  let total = 0;
  const desglose: CriterioEvaluado[] = [];
  const frases = {} as Record<CriterioId, string | null>;

  for (const criterio of CRITERIOS_V1) {
    const r = criterio.evaluar(e.tutor, ctx);
    const valor = Math.min(1, Math.max(0, r.valor));
    const peso = config.pesos[criterio.id];
    const aporte = valor * peso * 100;
    total += aporte;
    desglose.push({
      criterio: criterio.id,
      valor: redondear(valor, 4),
      peso,
      aporte: redondear(aporte, 2),
      evidencia: r.evidencia,
    });
    frases[criterio.id] = r.frase;
  }

  return {
    tutorId: e.tutor.tutorId,
    nombre: e.tutor.nombre,
    score: Math.min(100, Math.max(0, redondear(total, 1))),
    desglose,
    frases,
    nivelPrioridad: e.tutor.nivelPrioridad,
    asignacionesActivas: e.tutor.asignacionesActivas,
    minutosCompartidos: e.minutosCompartidos,
  };
}

const aCandidato = (e: Evaluacion, posicion: number): CandidatoEvaluado => ({
  tutorId: e.tutorId,
  posicion,
  score: e.score,
  desglose: e.desglose,
});

export function evaluar(
  solicitud: SolicitudMatching,
  candidatos: TutorCandidato[],
  config: ConfigMatching,
): ResultadoMatching {
  const { elegibles, descartados } = filtrarElegibles(solicitud, candidatos);

  if (elegibles.length === 0) {
    return {
      resultado: 'SIN_CANDIDATOS',
      alternativas: [],
      ranking: [],
      descartados,
      justificacion: justificarSinCandidatos(candidatos.length, descartados),
      configVersion: config.version,
    };
  }

  const evaluados = elegibles.map((e) => puntuar(e, solicitud, config)).sort(compararCandidatos);
  const ranking = evaluados.map((e, i) => aCandidato(e, i + 1));
  const topN = Math.max(1, config.parametros.topN);
  const [primero, segundo] = evaluados;

  return {
    resultado: 'RECOMENDADO',
    recomendado: ranking[0],
    alternativas: ranking.slice(1, topN),
    ranking,
    descartados,
    justificacion: justificarRecomendacion(
      primero!,
      segundo,
      segundo ? reglaDecisiva(primero!, segundo) : undefined,
    ),
    configVersion: config.version,
  };
}
