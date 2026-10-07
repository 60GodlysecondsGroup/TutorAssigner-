import type { ResultadoMatching } from '@tutorias/contracts/matching';
import type { DbOrTrx } from '../../platform/db';
import type { CandidatoRow, EntradaSnapshot, RecomendacionRow } from './recomendaciones.mapper';

export type RecomendacionConCandidatos = { rec: RecomendacionRow; candidatos: CandidatoRow[] };

/** Único código que toca `recomendaciones` y `recomendacion_candidatos`. */
export interface RecomendacionesRepository {
  insertar(datos: {
    solicitudId: string;
    configId: string;
    resultado: ResultadoMatching;
    snapshot: EntradaSnapshot;
    generadaPor: string | null;
  }): Promise<string>;
  obtener(id: string): Promise<RecomendacionConCandidatos | undefined>;
  /** Historial de una solicitud, la más reciente primero (2 consultas, sin N+1). */
  listarPorSolicitud(solicitudId: string): Promise<RecomendacionConCandidatos[]>;
  idMasReciente(solicitudId: string): Promise<string | undefined>;
}

export function createRecomendacionesRepository(db: DbOrTrx): RecomendacionesRepository {
  const base = () =>
    db('recomendaciones as r')
      .join('matching_config as mc', 'mc.id', 'r.config_id')
      .select(
        'r.id',
        'r.solicitud_id',
        'r.config_id',
        'mc.version as config_version',
        'r.resultado',
        'r.tutor_recomendado_id',
        'r.score',
        'r.justificacion',
        'r.entrada_snapshot',
        'r.created_at',
      );

  const candidatosDe = async (ids: string[]) => {
    if (ids.length === 0) return new Map<string, CandidatoRow[]>();
    const filas: CandidatoRow[] = await db('recomendacion_candidatos').whereIn(
      'recomendacion_id',
      ids,
    );
    const porRec = new Map<string, CandidatoRow[]>();
    for (const f of filas)
      porRec.set(f.recomendacion_id, [...(porRec.get(f.recomendacion_id) ?? []), f]);
    return porRec;
  };

  return {
    async insertar({ solicitudId, configId, resultado, snapshot, generadaPor }) {
      const [{ id }] = await db('recomendaciones')
        .insert({
          solicitud_id: solicitudId,
          config_id: configId,
          resultado: resultado.resultado,
          tutor_recomendado_id: resultado.recomendado?.tutorId ?? null,
          score: resultado.recomendado?.score ?? null,
          justificacion: resultado.justificacion,
          entrada_snapshot: JSON.stringify(snapshot),
          generada_por: generadaPor,
        })
        .returning('id');

      const filas = [
        ...resultado.ranking.map((c) => ({
          recomendacion_id: id,
          tutor_id: c.tutorId,
          elegible: true,
          posicion: c.posicion,
          score: c.score,
          desglose: JSON.stringify(c.desglose),
        })),
        ...resultado.descartados.map((d) => ({
          recomendacion_id: id,
          tutor_id: d.tutorId,
          elegible: false,
          posicion: null,
          score: null,
          desglose: JSON.stringify({ motivos: d.motivos }),
        })),
      ];
      if (filas.length > 0) await db('recomendacion_candidatos').insert(filas);
      return id as string;
    },

    async obtener(id) {
      const rec: RecomendacionRow | undefined = await base().where('r.id', id).first();
      if (!rec) return undefined;
      return { rec, candidatos: (await candidatosDe([rec.id])).get(rec.id) ?? [] };
    },

    async listarPorSolicitud(solicitudId) {
      const recs: RecomendacionRow[] = await base()
        .where('r.solicitud_id', solicitudId)
        .orderBy([
          { column: 'r.created_at', order: 'desc' },
          { column: 'r.id', order: 'desc' },
        ]);
      const candidatos = await candidatosDe(recs.map((r) => r.id));
      return recs.map((rec) => ({ rec, candidatos: candidatos.get(rec.id) ?? [] }));
    },

    async idMasReciente(solicitudId) {
      const fila = await db('recomendaciones')
        .where({ solicitud_id: solicitudId })
        .orderBy([
          { column: 'created_at', order: 'desc' },
          { column: 'id', order: 'desc' },
        ])
        .first('id');
      return fila?.id;
    },
  };
}
