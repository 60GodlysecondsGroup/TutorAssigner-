import type {
  ConfigMatching,
  CriterioId,
  FranjaHoraria,
  SolicitudMatching,
  TutorCandidato,
} from '@tutorias/contracts/matching';

/** Datos precalculados que comparten los evaluadores (se calculan una vez por candidato). */
export type ContextoEvaluacion = {
  solicitud: SolicitudMatching;
  config: ConfigMatching;
  /** Bloques compartidos entre la solicitud y el tutor. */
  bloques: FranjaHoraria[];
  minutosCompartidos: number;
};

export type ResultadoCriterio = {
  /** 0–1 */
  valor: number;
  /** Texto del desglose, p. ej. "domina Cálculo I (4/5)". */
  evidencia: string;
  /** Frase corta para la justificación; `null` si no aporta información (p. ej. sin preferencias). */
  frase: string | null;
};

export type EvaluadorCriterio = (
  tutor: TutorCandidato,
  ctx: ContextoEvaluacion,
) => ResultadoCriterio;

export type Criterio = { id: CriterioId; etiqueta: string; evaluar: EvaluadorCriterio };
