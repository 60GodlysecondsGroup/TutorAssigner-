/** Filas de BD ↔ DTOs del contrato. */
import type {
  ConfigMatching,
  CriterioEvaluado,
  MotivoDescarte,
  SolicitudMatching,
  TutorCandidato,
} from '@tutorias/contracts/matching';
import type {
  Asignacion,
  ConfiguracionMatching,
  EstadoAsignacion,
  Recomendacion,
} from '@tutorias/contracts/recomendaciones';

// ── Snapshot ─────────────────────────────────────────────────────────────────

/** Datos exactos usados en el cálculo: re-evaluarlos reproduce el mismo resultado. */
export type EntradaSnapshot = {
  solicitud: SolicitudMatching;
  candidatos: TutorCandidato[];
  config: ConfigMatching;
  /** Datos de presentación (no entran al motor). */
  contexto: { estudianteId: string; estudianteNombre: string; materiaNombre: string };
};

// ── Configuración ────────────────────────────────────────────────────────────

export type ConfigRow = {
  id: string;
  version: number;
  pesos: ConfigMatching['pesos'];
  parametros: ConfigMatching['parametros'];
  vigente: boolean;
  creada_por: string | null;
  created_at: Date;
};

export const toConfiguracion = (row: ConfigRow): ConfiguracionMatching => ({
  id: row.id,
  version: row.version,
  pesos: row.pesos,
  parametros: row.parametros,
  vigente: row.vigente,
  createdAt: row.created_at.toISOString(),
});

export const toConfigMotor = (row: ConfigRow): ConfigMatching => ({
  version: row.version,
  pesos: row.pesos,
  parametros: row.parametros,
});

// ── Recomendaciones ──────────────────────────────────────────────────────────

export type RecomendacionRow = {
  id: string;
  solicitud_id: string;
  config_id: string;
  config_version: number;
  resultado: 'RECOMENDADO' | 'SIN_CANDIDATOS';
  tutor_recomendado_id: string | null;
  score: string | null;
  justificacion: string;
  entrada_snapshot: EntradaSnapshot;
  created_at: Date;
};

export type CandidatoRow = {
  recomendacion_id: string;
  tutor_id: string;
  elegible: boolean;
  posicion: number | null;
  score: string | null;
  /** Elegible: criterios. Descartado: `{ motivos }`. */
  desglose: CriterioEvaluado[] | { motivos: MotivoDescarte[] };
};

const num = (v: string | null) => (v === null ? undefined : Number(v));

export function toRecomendacion(row: RecomendacionRow, candidatos: CandidatoRow[]): Recomendacion {
  const snapshot = row.entrada_snapshot;
  const nombre = new Map(snapshot.candidatos.map((c) => [c.tutorId, c.nombre]));
  const topN = snapshot.config.parametros.topN;
  const nombreDe = (id: string) => nombre.get(id) ?? 'Tutor';

  return {
    id: row.id,
    solicitudId: row.solicitud_id,
    configId: row.config_id,
    configVersion: row.config_version,
    resultado: row.resultado,
    ...(row.tutor_recomendado_id ? { tutorRecomendadoId: row.tutor_recomendado_id } : {}),
    ...(row.score !== null ? { score: Number(row.score) } : {}),
    justificacion: row.justificacion,
    candidatos: candidatos
      .filter((c) => c.elegible && c.posicion !== null && c.posicion <= topN)
      .sort((a, b) => a.posicion! - b.posicion!)
      .map((c) => ({
        tutorId: c.tutor_id,
        nombre: nombreDe(c.tutor_id),
        posicion: c.posicion!,
        score: num(c.score) ?? 0,
        desglose: c.desglose as CriterioEvaluado[],
      })),
    descartados: candidatos
      .filter((c) => !c.elegible)
      .sort((a, b) => (a.tutor_id < b.tutor_id ? -1 : 1))
      .map((c) => ({
        tutorId: c.tutor_id,
        nombre: nombreDe(c.tutor_id),
        motivos: (c.desglose as { motivos: MotivoDescarte[] }).motivos,
      })),
    createdAt: row.created_at.toISOString(),
  };
}

// ── Asignaciones ─────────────────────────────────────────────────────────────

export type AsignacionRow = {
  id: string;
  solicitud_id: string;
  tutor_id: string;
  recomendacion_id: string | null;
  motivo_cambio: string | null;
  estado: EstadoAsignacion;
  creada_por: string | null;
  created_at: Date;
  updated_at: Date;
  /** Del snapshot de la recomendación (puede faltar si no hubo recomendación). */
  tutor_nombre: string | null;
  estudiante_nombre: string | null;
  materia_nombre: string | null;
  score: string | null;
};

export const SIN_DATO = '—';

export const toAsignacion = (row: AsignacionRow): Asignacion => ({
  id: row.id,
  solicitudId: row.solicitud_id,
  tutorId: row.tutor_id,
  tutorNombre: row.tutor_nombre ?? SIN_DATO,
  estudianteNombre: row.estudiante_nombre ?? SIN_DATO,
  materiaNombre: row.materia_nombre ?? SIN_DATO,
  ...(row.recomendacion_id ? { recomendacionId: row.recomendacion_id } : {}),
  ...(row.score !== null ? { score: Number(row.score) } : {}),
  ...(row.motivo_cambio ? { motivoCambio: row.motivo_cambio } : {}),
  estado: row.estado,
  creadaPor: row.creada_por,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});
