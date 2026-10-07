/**
 * Confirmar, finalizar y cancelar asignaciones (RN-R02, RN-R03, RN-R06).
 *
 * Concurrencia:
 * - Mismo tutor: `pg_advisory_xact_lock` por tutor antes de contar sus activas → nunca supera su cupo.
 * - Misma solicitud: índice único parcial `ux_asignacion_activa_solicitud` → la segunda recibe 409.
 * - Datos que cambian entre recomendar y confirmar: se revalida todo dentro de la transacción y,
 *   si algo cambió, 409 RECOMENDACION_OBSOLETA para que el frontend regenere.
 */
import { franjas } from '@tutorias/matching';
import type {
  Asignacion,
  CambiarEstadoAsignacionRequest,
  ConfirmarAsignacionRequest,
  ListarAsignacionesQuery,
} from '@tutorias/contracts/recomendaciones';
import type { PageMeta } from '@tutorias/contracts/common';
import { withTransaction, type Db } from '../../platform/db';
import { pageMeta } from '../../platform/http';
import { createAsignacionesRepository } from './asignaciones.repository';
import type { Puertos } from './ports';
import { createRecomendacionesRepository } from './recomendaciones.repository';
import { aSolicitudMatching } from './recomendaciones.service';
import {
  asignacionNoEncontrada,
  motivoRequerido,
  recomendacionNoEncontrada,
  recomendacionObsoleta,
  sinCupoTutor,
  solicitudNoAbierta,
  solicitudNoEncontrada,
  solicitudYaAsignada,
  transicionInvalida,
  tutorNoElegible,
} from './recomendaciones.errors';
import { SIN_DATO, toAsignacion, type AsignacionRow } from './recomendaciones.mapper';

const PG_UNIQUE_VIOLATION = '23505';

/** Igualdad estructural estable (independiente del orden de claves). */
const canonico = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  );

export type AsignacionesService = ReturnType<typeof createAsignacionesService>;

export function createAsignacionesService(deps: Puertos & { db: Db }) {
  const { db, tutores, solicitudes } = deps;

  /** Completa nombres cuando la asignación no tiene snapshot de recomendación (caso poco común). */
  async function aDtos(filas: AsignacionRow[]): Promise<Asignacion[]> {
    const sinNombre = [...new Set(filas.filter((f) => !f.tutor_nombre).map((f) => f.tutor_id))];
    const nombres = new Map(
      (await tutores.obtenerResumenes(sinNombre)).map((t) => [t.tutorId, t.nombre]),
    );
    const sinContexto = [
      ...new Set(filas.filter((f) => !f.estudiante_nombre).map((f) => f.solicitud_id)),
    ];
    const contexto = new Map(
      (await Promise.all(sinContexto.map((id) => solicitudes.obtenerParaMatching(id))))
        .filter((s) => s !== null)
        .map((s) => [s.solicitudId, s]),
    );
    return filas.map((f) =>
      toAsignacion({
        ...f,
        tutor_nombre: f.tutor_nombre ?? nombres.get(f.tutor_id) ?? SIN_DATO,
        estudiante_nombre:
          f.estudiante_nombre ?? contexto.get(f.solicitud_id)?.estudianteNombre ?? SIN_DATO,
        materia_nombre: f.materia_nombre ?? contexto.get(f.solicitud_id)?.materiaNombre ?? SIN_DATO,
      }),
    );
  }

  async function obtener(id: string): Promise<Asignacion> {
    const fila = await createAsignacionesRepository(db).obtener(id);
    if (!fila) throw asignacionNoEncontrada(id);
    const [dto] = await aDtos([fila]);
    return dto!;
  }

  return {
    obtener,

    async confirmar(
      { recomendacionId, tutorId, motivoCambio }: ConfirmarAsignacionRequest,
      usuarioId: string | null,
    ): Promise<Asignacion> {
      const encontrada = await createRecomendacionesRepository(db).obtener(recomendacionId);
      if (!encontrada) throw recomendacionNoEncontrada(recomendacionId);
      const { rec, candidatos } = encontrada;

      const candidato = candidatos.find((c) => c.tutor_id === tutorId);
      if (!candidato?.elegible) throw tutorNoElegible();
      const esRecomendado = rec.tutor_recomendado_id === tutorId;
      const motivo = motivoCambio?.trim() || null;
      if (!esRecomendado && !motivo) throw motivoRequerido();

      const id = await withTransaction(db, async (trx) => {
        const asignaciones = createAsignacionesRepository(trx);
        await asignaciones.bloquearTutor(tutorId);

        // Solicitud: existe, sigue abierta y sin asignación activa.
        const solicitud = await solicitudes.obtenerParaMatching(rec.solicitud_id);
        if (!solicitud) throw solicitudNoEncontrada(rec.solicitud_id);
        if (solicitud.estado === 'ASIGNADA') throw solicitudYaAsignada();
        if (solicitud.estado !== 'ABIERTA') throw solicitudNoAbierta(solicitud.estado);
        if (await asignaciones.existeActivaParaSolicitud(rec.solicitud_id))
          throw solicitudYaAsignada();

        // ¿La recomendación sigue reflejando los datos actuales?
        const masReciente = await createRecomendacionesRepository(trx).idMasReciente(
          rec.solicitud_id,
        );
        if (masReciente !== rec.id)
          throw recomendacionObsoleta('hay una recomendación más reciente');
        if (canonico(aSolicitudMatching(solicitud)) !== canonico(rec.entrada_snapshot.solicitud)) {
          throw recomendacionObsoleta('la solicitud cambió');
        }
        const actual = (await tutores.listarCandidatos(solicitud.materiaId)).find(
          (t) => t.tutorId === tutorId,
        );
        if (!actual) throw recomendacionObsoleta('el tutor ya no está disponible para la materia');
        if (
          !franjas.tieneBloqueSuficiente(
            solicitud.franjas,
            actual.franjas,
            solicitud.duracionSesionMin,
          )
        ) {
          throw recomendacionObsoleta('el tutor ya no comparte horario');
        }

        // Cupo, contado bajo el lock del tutor.
        const activas = (await asignaciones.contarActivas([tutorId])).get(tutorId) ?? 0;
        if (activas >= actual.capacidadMaxima) throw sinCupoTutor();

        let nuevoId: string;
        try {
          nuevoId = await asignaciones.insertar({
            solicitudId: rec.solicitud_id,
            tutorId,
            recomendacionId: rec.id,
            motivoCambio: esRecomendado ? null : motivo,
            creadaPor: usuarioId,
          });
        } catch (err) {
          if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) throw solicitudYaAsignada();
          throw err;
        }
        await solicitudes.marcarAsignada(rec.solicitud_id, trx);
        return nuevoId;
      });

      return obtener(id);
    },

    async cambiarEstado(
      id: string,
      { estado }: CambiarEstadoAsignacionRequest,
    ): Promise<Asignacion> {
      await withTransaction(db, async (trx) => {
        const repo = createAsignacionesRepository(trx);
        const actual = await repo.obtenerParaActualizar(id);
        if (!actual) throw asignacionNoEncontrada(id);
        if (actual.estado !== 'ACTIVA') throw transicionInvalida(actual.estado, estado);
        await repo.actualizarEstado(id, estado);
        // Al cancelar, la solicitud vuelve a ABIERTA y puede recibir otra recomendación.
        if (estado === 'CANCELADA') await solicitudes.reabrir(actual.solicitud_id, trx);
      });
      return obtener(id);
    },

    async listar(query: ListarAsignacionesQuery): Promise<{ data: Asignacion[]; meta: PageMeta }> {
      const { rows, total } = await createAsignacionesRepository(db).listar(query);
      return { data: await aDtos(rows), meta: pageMeta(query, total) };
    },
  };
}
