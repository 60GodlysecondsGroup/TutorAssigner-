/**
 * @tutorias/contracts/recomendaciones — recomendaciones, asignaciones y configuración de pesos.
 * Dueño: Dev 4 (backend) · consumidor: Dev 5 (spec-05 y spec-06).
 *
 * POST  /recomendaciones                 GenerarRecomendacionRequest → 201 Ok<Recomendacion>
 * GET   /recomendaciones?solicitudId=    → Ok<Recomendacion[]> (más reciente primero)
 * GET   /recomendaciones/:id             → Ok<Recomendacion>
 * POST  /asignaciones                    ConfirmarAsignacionRequest → 201 Ok<Asignacion>
 * GET   /asignaciones?tutorId&estado&page → Page<Asignacion>
 * PATCH /asignaciones/:id                CambiarEstadoAsignacionRequest → Ok<Asignacion>
 * GET   /matching/config                 → Ok<ConfiguracionMatching>
 * PUT   /matching/config                 ActualizarConfigRequest → 201 Ok<ConfiguracionMatching>
 */
import { z } from 'zod';
import { Id, IsoDateTime, PaginationQuery } from '../common/index';
import {
  CriterioEvaluado,
  MotivoDescarte,
  ParametrosMatching,
  PesosMatching,
} from '../matching/index';

// ── Recomendaciones ──────────────────────────────────────────────────────────

export const GenerarRecomendacionRequest = z.object({ solicitudId: Id });
export type GenerarRecomendacionRequest = z.infer<typeof GenerarRecomendacionRequest>;

export const ListarRecomendacionesQuery = z.object({ solicitudId: Id });
export type ListarRecomendacionesQuery = z.infer<typeof ListarRecomendacionesQuery>;

export const CandidatoRecomendacion = z.object({
  tutorId: Id,
  nombre: z.string().min(1),
  posicion: z.number().int().min(1),
  score: z.number().min(0).max(100),
  desglose: z.array(CriterioEvaluado),
});
export type CandidatoRecomendacion = z.infer<typeof CandidatoRecomendacion>;

export const DescartadoRecomendacion = z.object({
  tutorId: Id,
  nombre: z.string().min(1),
  motivos: z.array(MotivoDescarte).min(1),
});
export type DescartadoRecomendacion = z.infer<typeof DescartadoRecomendacion>;

export const Recomendacion = z.object({
  id: Id,
  solicitudId: Id,
  configId: Id,
  configVersion: z.number().int().min(1),
  resultado: z.enum(['RECOMENDADO', 'SIN_CANDIDATOS']),
  /** Solo si resultado = RECOMENDADO. */
  tutorRecomendadoId: Id.optional(),
  score: z.number().min(0).max(100).optional(),
  justificacion: z.string().min(1).max(280),
  /** Recomendado (posición 1) y alternativas hasta topN, en orden. */
  candidatos: z.array(CandidatoRecomendacion),
  descartados: z.array(DescartadoRecomendacion),
  createdAt: IsoDateTime,
});
export type Recomendacion = z.infer<typeof Recomendacion>;

// ── Asignaciones ─────────────────────────────────────────────────────────────

export const EstadoAsignacion = z.enum(['ACTIVA', 'FINALIZADA', 'CANCELADA']);
export type EstadoAsignacion = z.infer<typeof EstadoAsignacion>;

export const ConfirmarAsignacionRequest = z.object({
  recomendacionId: Id,
  tutorId: Id,
  /** Obligatorio si el tutor elegido no es el recomendado (422 MOTIVO_REQUERIDO). */
  motivoCambio: z.string().trim().max(500).optional(),
});
export type ConfirmarAsignacionRequest = z.infer<typeof ConfirmarAsignacionRequest>;

/** ACTIVA → FINALIZADA | CANCELADA; los demás estados son terminales. */
export const CambiarEstadoAsignacionRequest = z.object({
  estado: z.enum(['FINALIZADA', 'CANCELADA']),
});
export type CambiarEstadoAsignacionRequest = z.infer<typeof CambiarEstadoAsignacionRequest>;

export const ListarAsignacionesQuery = PaginationQuery.extend({
  tutorId: Id.optional(),
  solicitudId: Id.optional(),
  estado: EstadoAsignacion.optional(),
});
export type ListarAsignacionesQuery = z.infer<typeof ListarAsignacionesQuery>;

export const Asignacion = z.object({
  id: Id,
  solicitudId: Id,
  tutorId: Id,
  tutorNombre: z.string(),
  estudianteNombre: z.string(),
  materiaNombre: z.string(),
  recomendacionId: Id.optional(),
  /** Score que obtuvo el tutor asignado en la recomendación. */
  score: z.number().min(0).max(100).optional(),
  motivoCambio: z.string().optional(),
  estado: EstadoAsignacion,
  creadaPor: Id.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Asignacion = z.infer<typeof Asignacion>;

// ── Configuración de pesos ───────────────────────────────────────────────────

export const ActualizarConfigRequest = z.object({
  pesos: PesosMatching,
  parametros: ParametrosMatching,
});
export type ActualizarConfigRequest = z.infer<typeof ActualizarConfigRequest>;

export const ConfiguracionMatching = z.object({
  id: Id,
  version: z.number().int().min(1),
  pesos: PesosMatching,
  parametros: ParametrosMatching,
  vigente: z.boolean(),
  createdAt: IsoDateTime,
});
export type ConfiguracionMatching = z.infer<typeof ConfiguracionMatching>;

// ── Errores ──────────────────────────────────────────────────────────────────

export const RecomendacionesErrorCode = {
  SOLICITUD_NOT_FOUND: 'SOLICITUD_NOT_FOUND',
  RECOMENDACION_NOT_FOUND: 'RECOMENDACION_NOT_FOUND',
  ASIGNACION_NOT_FOUND: 'ASIGNACION_NOT_FOUND',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  SOLICITUD_NO_ABIERTA: 'SOLICITUD_NO_ABIERTA',
  SOLICITUD_YA_ASIGNADA: 'SOLICITUD_YA_ASIGNADA',
  SIN_CUPO_TUTOR: 'SIN_CUPO_TUTOR',
  RECOMENDACION_OBSOLETA: 'RECOMENDACION_OBSOLETA',
  TRANSICION_INVALIDA: 'TRANSICION_INVALIDA',
  MOTIVO_REQUERIDO: 'MOTIVO_REQUERIDO',
  /** 422: el tutor elegido no fue elegible en esa recomendación. */
  TUTOR_NO_ELEGIBLE: 'TUTOR_NO_ELEGIBLE',
  PESOS_INVALIDOS: 'PESOS_INVALIDOS',
} as const;
export type RecomendacionesErrorCode =
  (typeof RecomendacionesErrorCode)[keyof typeof RecomendacionesErrorCode];
