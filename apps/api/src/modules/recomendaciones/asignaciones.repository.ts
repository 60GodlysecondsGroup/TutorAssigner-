import type {
  EstadoAsignacion,
  ListarAsignacionesQuery,
} from '@tutorias/contracts/recomendaciones';
import { paginate, type DbOrTrx } from '../../platform/db';
import type { AsignacionRow } from './recomendaciones.mapper';

export type AsignacionBase = {
  id: string;
  solicitud_id: string;
  tutor_id: string;
  estado: EstadoAsignacion;
};

/** Único código que toca `asignaciones` (y lee el snapshot de su recomendación, tabla propia). */
export interface AsignacionesRepository {
  /** Lock consultivo de transacción por tutor: serializa confirmaciones que compiten por su cupo. */
  bloquearTutor(tutorId: string): Promise<void>;
  contarActivas(tutorIds: string[]): Promise<Map<string, number>>;
  existeActivaParaSolicitud(solicitudId: string): Promise<boolean>;
  insertar(datos: {
    solicitudId: string;
    tutorId: string;
    recomendacionId: string;
    motivoCambio: string | null;
    creadaPor: string | null;
  }): Promise<string>;
  obtener(id: string): Promise<AsignacionRow | undefined>;
  obtenerParaActualizar(id: string): Promise<AsignacionBase | undefined>;
  actualizarEstado(id: string, estado: EstadoAsignacion): Promise<void>;
  listar(query: ListarAsignacionesQuery): Promise<{ rows: AsignacionRow[]; total: number }>;
}

export function createAsignacionesRepository(db: DbOrTrx): AsignacionesRepository {
  /** Asignación + nombres y score desde el snapshot de su recomendación (1:1, sin N+1). */
  const detalle = () =>
    db('asignaciones as a')
      .leftJoin('recomendaciones as r', 'r.id', 'a.recomendacion_id')
      .leftJoin('recomendacion_candidatos as rc', function () {
        this.on('rc.recomendacion_id', '=', 'a.recomendacion_id').andOn(
          'rc.tutor_id',
          '=',
          'a.tutor_id',
        );
      })
      .select(
        'a.id',
        'a.solicitud_id',
        'a.tutor_id',
        'a.recomendacion_id',
        'a.motivo_cambio',
        'a.estado',
        'a.creada_por',
        'a.created_at',
        'a.updated_at',
        'rc.score',
        db.raw("r.entrada_snapshot -> 'contexto' ->> 'estudianteNombre' AS estudiante_nombre"),
        db.raw("r.entrada_snapshot -> 'contexto' ->> 'materiaNombre' AS materia_nombre"),
        db.raw(`(SELECT c ->> 'nombre' FROM jsonb_array_elements(r.entrada_snapshot -> 'candidatos') c
                 WHERE c ->> 'tutorId' = a.tutor_id::text LIMIT 1) AS tutor_nombre`),
      );

  return {
    async bloquearTutor(tutorId) {
      await db.raw('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
        `asignaciones:tutor:${tutorId}`,
      ]);
    },

    async contarActivas(tutorIds) {
      const conteo = new Map(tutorIds.map((id) => [id, 0]));
      if (tutorIds.length === 0) return conteo;
      const filas: { tutor_id: string; total: string }[] = await db('asignaciones')
        .where({ estado: 'ACTIVA' })
        .whereIn('tutor_id', tutorIds)
        .groupBy('tutor_id')
        .select('tutor_id')
        .count({ total: '*' });
      for (const f of filas) conteo.set(f.tutor_id, Number(f.total));
      return conteo;
    },

    async existeActivaParaSolicitud(solicitudId) {
      return Boolean(
        await db('asignaciones').where({ solicitud_id: solicitudId, estado: 'ACTIVA' }).first('id'),
      );
    },

    async insertar({ solicitudId, tutorId, recomendacionId, motivoCambio, creadaPor }) {
      const [{ id }] = await db('asignaciones')
        .insert({
          solicitud_id: solicitudId,
          tutor_id: tutorId,
          recomendacion_id: recomendacionId,
          motivo_cambio: motivoCambio,
          estado: 'ACTIVA',
          creada_por: creadaPor,
        })
        .returning('id');
      return id as string;
    },

    async obtener(id) {
      return detalle().where('a.id', id).first();
    },

    async obtenerParaActualizar(id) {
      return db('asignaciones')
        .where({ id })
        .forUpdate()
        .first('id', 'solicitud_id', 'tutor_id', 'estado');
    },

    async actualizarEstado(id, estado) {
      await db('asignaciones').where({ id }).update({ estado });
    },

    async listar({ page, pageSize, tutorId, solicitudId, estado }) {
      const query = detalle().orderBy([
        { column: 'a.created_at', order: 'desc' },
        { column: 'a.id', order: 'desc' },
      ]);
      if (tutorId) query.where('a.tutor_id', tutorId);
      if (solicitudId) query.where('a.solicitud_id', solicitudId);
      if (estado) query.where('a.estado', estado);
      return paginate<AsignacionRow>(query, { page, pageSize });
    },
  };
}
