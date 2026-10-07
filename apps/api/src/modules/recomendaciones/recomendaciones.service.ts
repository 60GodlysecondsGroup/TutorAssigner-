/**
 * Caso de uso «Generar recomendación» (RN-R01) y consultas del historial.
 * La lógica de scoring vive en el motor (`@tutorias/matching`); aquí solo se orquesta y persiste.
 */
import { evaluar } from '@tutorias/matching';
import type { SolicitudMatching, TutorCandidato } from '@tutorias/contracts/matching';
import type { Recomendacion } from '@tutorias/contracts/recomendaciones';
import { withTransaction, type Db } from '../../platform/db';
import { createAsignacionesRepository } from './asignaciones.repository';
import type { ConfigService } from './config.service';
import type { Puertos, SolicitudParaMatching } from './ports';
import { createRecomendacionesRepository } from './recomendaciones.repository';
import {
  recomendacionNoEncontrada,
  solicitudNoAbierta,
  solicitudNoEncontrada,
} from './recomendaciones.errors';
import { toRecomendacion, type EntradaSnapshot } from './recomendaciones.mapper';

export type RecomendacionesService = ReturnType<typeof createRecomendacionesService>;

/** Solicitud en la forma del motor (lo que entra al cálculo y al snapshot). */
export const aSolicitudMatching = (s: SolicitudParaMatching): SolicitudMatching => ({
  solicitudId: s.solicitudId,
  materiaId: s.materiaId,
  materiaNombre: s.materiaNombre,
  franjas: s.franjas,
  duracionSesionMin: s.duracionSesionMin,
  preferencias: s.preferencias,
});

export function createRecomendacionesService(deps: Puertos & { db: Db; config: ConfigService }) {
  const { db, tutores, solicitudes, config } = deps;

  async function obtener(id: string): Promise<Recomendacion> {
    const encontrada = await createRecomendacionesRepository(db).obtener(id);
    if (!encontrada) throw recomendacionNoEncontrada(id);
    return toRecomendacion(encontrada.rec, encontrada.candidatos);
  }

  return {
    obtener,

    async generar(solicitudId: string, usuarioId: string | null): Promise<Recomendacion> {
      // 1. Solicitud abierta
      const solicitud = await solicitudes.obtenerParaMatching(solicitudId);
      if (!solicitud) throw solicitudNoEncontrada(solicitudId);
      if (solicitud.estado !== 'ABIERTA') throw solicitudNoAbierta(solicitud.estado);

      // 2–4. Candidatos, su carga activa (tabla propia) y configuración vigente
      const tutoresMateria = await tutores.listarCandidatos(solicitud.materiaId);
      const activas = await createAsignacionesRepository(db).contarActivas(
        tutoresMateria.map((t) => t.tutorId),
      );
      const { id: configId, config: cfg } = await config.vigenteParaMotor();

      const entrada = aSolicitudMatching(solicitud);
      const candidatos: TutorCandidato[] = tutoresMateria.map((t) => ({
        ...t,
        asignacionesActivas: activas.get(t.tutorId) ?? 0,
      }));

      // 5. Cálculo puro
      const resultado = evaluar(entrada, candidatos, cfg);

      // 6. Recomendación + candidatos + snapshot en una transacción
      const snapshot: EntradaSnapshot = {
        solicitud: entrada,
        candidatos,
        config: cfg,
        contexto: {
          estudianteId: solicitud.estudianteId,
          estudianteNombre: solicitud.estudianteNombre,
          materiaNombre: solicitud.materiaNombre,
        },
      };
      const id = await withTransaction(db, (trx) =>
        createRecomendacionesRepository(trx).insertar({
          solicitudId,
          configId,
          resultado,
          snapshot,
          generadaPor: usuarioId,
        }),
      );

      // 7. DTO
      return obtener(id);
    },

    async listarPorSolicitud(solicitudId: string): Promise<Recomendacion[]> {
      const historial = await createRecomendacionesRepository(db).listarPorSolicitud(solicitudId);
      return historial.map(({ rec, candidatos }) => toRecomendacion(rec, candidatos));
    },
  };
}
