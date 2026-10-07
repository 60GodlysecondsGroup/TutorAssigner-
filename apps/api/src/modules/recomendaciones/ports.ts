/**
 * Puertos definidos por este módulo (consumidor). Recomendaciones depende de estas interfaces, no de
 * los módulos de Tutores y Solicitudes: los adaptadores traducen sus API públicas y los fakes las
 * simulan con fixtures hasta la integración (H3).
 */
import { z } from 'zod';
import { FranjaHoraria, PreferenciasMatching } from '@tutorias/contracts/matching';
import type { TutorParaMatching, TutorResumenPublico } from '@tutorias/contracts/tutores';
import type { Trx } from '../../platform/db';

export const EstadoSolicitud = z.enum(['ABIERTA', 'ASIGNADA', 'CANCELADA']);
export type EstadoSolicitud = z.infer<typeof EstadoSolicitud>;

/**
 * Lo que Recomendaciones necesita de una solicitud. Dev 3 lo publica como `SolicitudParaMatching`
 * en `@tutorias/contracts/solicitudes`; si su forma difiere, el adaptador traduce.
 */
export const SolicitudParaMatching = z.object({
  solicitudId: z.uuid(),
  estado: EstadoSolicitud,
  estudianteId: z.uuid(),
  estudianteNombre: z.string().min(1),
  materiaId: z.uuid(),
  materiaNombre: z.string().min(1),
  duracionSesionMin: z.number().int().min(30).max(240),
  franjas: z.array(FranjaHoraria),
  preferencias: PreferenciasMatching,
});
export type SolicitudParaMatching = z.infer<typeof SolicitudParaMatching>;

export interface TutoresPort {
  /** Tutores activos que dictan la materia, con franjas y nivel de dominio en ella. */
  listarCandidatos(materiaId: string): Promise<TutorParaMatching[]>;
  /** Resúmenes por id, incluidos los inactivos; omite ids inexistentes. */
  obtenerResumenes(ids: string[]): Promise<TutorResumenPublico[]>;
}

export interface SolicitudesPort {
  /** `null` si la solicitud no existe. */
  obtenerParaMatching(solicitudId: string): Promise<SolicitudParaMatching | null>;
  /** ABIERTA → ASIGNADA dentro de la transacción de la confirmación. */
  marcarAsignada(solicitudId: string, trx: Trx): Promise<void>;
  /** ASIGNADA → ABIERTA cuando se cancela su asignación (spec-06: puede recibir otra recomendación). */
  reabrir(solicitudId: string, trx: Trx): Promise<void>;
}

export type Puertos = { tutores: TutoresPort; solicitudes: SolicitudesPort };
