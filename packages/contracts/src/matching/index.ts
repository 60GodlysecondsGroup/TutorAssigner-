/**
 * @tutorias/contracts/matching — franjas horarias y entrada/salida del motor. Dueño: Dev 4.
 * Fuente: sección 10 del plan y docs/SPEC-Motor-Matching-Tutores.md.
 */
import { z } from 'zod';

// ── Franjas ──────────────────────────────────────────────────────────────────

export const HoraHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  message: 'La hora debe estar en formato HH:mm',
});

export const DiaSemana = z.number().int().min(1).max(7);

/** Franja semanal recurrente: 1 = lunes … 7 = domingo; `fin > inicio`, sin cruzar medianoche. */
export const FranjaHoraria = z
  .object({
    dia: DiaSemana,
    inicio: HoraHHMM,
    fin: HoraHHMM,
  })
  .refine(
    ({ inicio, fin }) => {
      const parse = (value: string) => {
        const [hours, minutes] = value.split(':');
        return Number(hours) * 60 + Number(minutes);
      };

      return parse(fin) > parse(inicio);
    },
    {
      message: 'La franja debe terminar después de comenzar',
      path: ['fin'],
    },
  );

export type DiaSemana = z.infer<typeof DiaSemana>;
export type HoraHHMM = z.infer<typeof HoraHHMM>;
export type FranjaHoraria = z.infer<typeof FranjaHoraria>;

// ── Entrada del motor ────────────────────────────────────────────────────────

export const NivelMatching = z.number().int().min(1).max(5);
export const ModalidadTutor = z.enum(['PRESENCIAL', 'VIRTUAL', 'AMBAS']);
export const ModalidadPreferida = z.enum(['PRESENCIAL', 'VIRTUAL']);
export type ModalidadTutor = z.infer<typeof ModalidadTutor>;
export type ModalidadPreferida = z.infer<typeof ModalidadPreferida>;

export const PreferenciasMatching = z.object({
  modalidad: ModalidadPreferida.optional(),
  tutorPreferidoId: z.uuid().optional(),
});
export type PreferenciasMatching = z.infer<typeof PreferenciasMatching>;

export const SolicitudMatching = z.object({
  solicitudId: z.uuid(),
  materiaId: z.uuid(),
  /** Solo para las evidencias («domina Cálculo I»); opcional. */
  materiaNombre: z.string().min(1).optional(),
  franjas: z.array(FranjaHoraria),
  duracionSesionMin: z.number().int().min(30).max(240),
  preferencias: PreferenciasMatching,
});
export type SolicitudMatching = z.infer<typeof SolicitudMatching>;

/** Lo arma Recomendaciones con datos de Tutores + su propia carga (asignaciones activas). */
export const TutorCandidato = z.object({
  tutorId: z.uuid(),
  nombre: z.string().min(1),
  nivelPrioridad: NivelMatching,
  nivelDominio: NivelMatching,
  modalidad: ModalidadTutor,
  franjas: z.array(FranjaHoraria),
  capacidadMaxima: z.number().int().positive(),
  asignacionesActivas: z.number().int().min(0),
});
export type TutorCandidato = z.infer<typeof TutorCandidato>;

export const CRITERIOS = ['dominio', 'horario', 'prioridad', 'preferencias', 'carga'] as const;
export const CriterioId = z.enum(CRITERIOS);
export type CriterioId = z.infer<typeof CriterioId>;

/** Forma de los pesos; que sumen 1 lo valida `validarConfig()` (regla de negocio, 422). */
export const PesosMatching = z.strictObject({
  dominio: z.number(),
  horario: z.number(),
  prioridad: z.number(),
  preferencias: z.number(),
  carga: z.number(),
});
export type PesosMatching = z.infer<typeof PesosMatching>;

export const ParametrosMatching = z.strictObject({
  topN: z.number().int(),
  bloquesHorarioIdeal: z.number().int(),
});
export type ParametrosMatching = z.infer<typeof ParametrosMatching>;

export const ConfigMatching = z.object({
  version: z.number().int().min(1),
  pesos: PesosMatching,
  parametros: ParametrosMatching,
});
export type ConfigMatching = z.infer<typeof ConfigMatching>;

// ── Salida del motor ─────────────────────────────────────────────────────────

export const MotivoDescarte = z.enum(['SIN_HORARIO_COMPATIBLE', 'SIN_CUPO']);
export type MotivoDescarte = z.infer<typeof MotivoDescarte>;

export const CriterioEvaluado = z.object({
  criterio: CriterioId,
  /** Valor normalizado 0–1. */
  valor: z.number().min(0).max(1),
  peso: z.number().min(0).max(1),
  /** valor × peso × 100: puntos que aporta al score. */
  aporte: z.number().min(0).max(100),
  evidencia: z.string(),
});
export type CriterioEvaluado = z.infer<typeof CriterioEvaluado>;

export const CandidatoEvaluado = z.object({
  tutorId: z.uuid(),
  /** 1 = recomendado. */
  posicion: z.number().int().min(1),
  /** 0–100 con un decimal. */
  score: z.number().min(0).max(100),
  desglose: z.array(CriterioEvaluado),
});
export type CandidatoEvaluado = z.infer<typeof CandidatoEvaluado>;

export const CandidatoDescartado = z.object({
  tutorId: z.uuid(),
  motivos: z.array(MotivoDescarte).min(1),
});
export type CandidatoDescartado = z.infer<typeof CandidatoDescartado>;

export const JUSTIFICACION_MAX = 280;

export const ResultadoMatching = z.object({
  resultado: z.enum(['RECOMENDADO', 'SIN_CANDIDATOS']),
  recomendado: CandidatoEvaluado.optional(),
  /** Siguientes topN − 1 del ranking. */
  alternativas: z.array(CandidatoEvaluado),
  /** Ranking completo de elegibles (se persiste para auditoría). */
  ranking: z.array(CandidatoEvaluado),
  descartados: z.array(CandidatoDescartado),
  justificacion: z.string().min(1).max(JUSTIFICACION_MAX),
  configVersion: z.number().int().min(1),
});
export type ResultadoMatching = z.infer<typeof ResultadoMatching>;
