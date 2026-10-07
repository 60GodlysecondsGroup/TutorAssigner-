/**
 * Módulo Estudiantes y Solicitudes — versión MVP de demo en un solo archivo (dueño: Dev 3).
 * Rutas: /estudiantes, /solicitudes. API pública: obtenerParaMatching, marcarAsignada, reabrir.
 */
import { Router } from 'express';
import { z } from 'zod';
import { IdParams } from '@tutorias/contracts/common';
import { FranjaHoraria, PreferenciasMatching } from '@tutorias/contracts/matching';
import { franjas as F } from '@tutorias/matching';
import { currentUser, requireRole } from '../../platform/auth';
import { withTransaction, type Db, type DbOrTrx, type Trx } from '../../platform/db';
import { AppError, sendCreated, sendOk, validate } from '../../platform/http';

const EstudianteCrear = z.object({
  nombre: z.string().trim().min(1),
  email: z.email(),
  codigo: z.string().trim().optional(),
  programa: z.string().trim().optional(),
  semestre: z.number().int().min(1).max(12).optional(),
});

const SolicitudCrear = z.object({
  estudianteId: z.uuid(),
  materiaId: z.uuid(),
  tema: z.string().trim().max(200).optional(),
  duracionSesionMin: z.number().int().min(30).max(240).default(60),
  franjas: z.array(FranjaHoraria).min(1, { error: 'Indica al menos una franja' }),
  preferencias: PreferenciasMatching.default({}),
});

const ListarQuery = z.object({ estado: z.enum(['ABIERTA', 'ASIGNADA', 'CANCELADA']).optional() });

const hhmm = (t: string) => t.slice(0, 5);

async function cargar(db: DbOrTrx, filtro: { id?: string; estado?: string } = {}) {
  const q = db('solicitudes as s')
    .join('estudiantes as e', 'e.id', 's.estudiante_id')
    .join('materias as m', 'm.id', 's.materia_id')
    .orderBy('s.created_at', 'desc')
    .select('s.*', 'e.nombre as estudiante_nombre', 'm.nombre as materia_nombre');
  if (filtro.id) q.where('s.id', filtro.id);
  if (filtro.estado) q.where('s.estado', filtro.estado);
  const filas = await q;
  const ids = filas.map((s) => s.id);
  const franjas = ids.length
    ? await db('solicitud_franjas').whereIn('solicitud_id', ids).orderBy(['dia', 'hora_inicio'])
    : [];
  return filas.map((s) => ({
    id: s.id as string,
    estudianteId: s.estudiante_id as string,
    estudianteNombre: s.estudiante_nombre as string,
    materiaId: s.materia_id as string,
    materiaNombre: s.materia_nombre as string,
    tema: s.tema as string | null,
    duracionSesionMin: s.duracion_sesion_min as number,
    preferencias: s.preferencias as z.infer<typeof PreferenciasMatching>,
    estado: s.estado as 'ABIERTA' | 'ASIGNADA' | 'CANCELADA',
    franjas: franjas
      .filter((f) => f.solicitud_id === s.id)
      .map((f) => ({ dia: f.dia, inicio: hhmm(f.hora_inicio), fin: hhmm(f.hora_fin) })),
    createdAt: (s.created_at as Date).toISOString(),
  }));
}

async function cambiarEstado(db: DbOrTrx, id: string, desde: string, hacia: string) {
  const n = await db('solicitudes').where({ id, estado: desde }).update({ estado: hacia });
  if (n === 0) {
    throw AppError.conflict('SOLICITUD_NO_ABIERTA', `La solicitud no está ${desde}`);
  }
}

export function createSolicitudesModule({ db }: { db: Db }) {
  const router = Router();
  const coordinador = requireRole('COORDINADOR');

  router.get('/estudiantes', coordinador, async (_req, res) => {
    sendOk(
      res,
      await db('estudiantes')
        .orderBy('nombre')
        .select('id', 'nombre', 'email', 'codigo', 'programa', 'semestre'),
    );
  });

  router.post(
    '/estudiantes',
    coordinador,
    validate({ body: EstudianteCrear }),
    async (req, res) => {
      const [fila] = await db('estudiantes')
        .insert(req.body)
        .returning(['id', 'nombre', 'email', 'codigo', 'programa', 'semestre']);
      sendCreated(res, fila);
    },
  );

  router.get('/solicitudes', coordinador, validate({ query: ListarQuery }), async (req, res) => {
    const { estado } = req.query as z.infer<typeof ListarQuery>;
    sendOk(res, await cargar(db, { estado }));
  });

  router.get('/solicitudes/:id', coordinador, validate({ params: IdParams }), async (req, res) => {
    const [s] = await cargar(db, { id: String(req.params.id) });
    if (!s) throw AppError.notFound('SOLICITUD_NOT_FOUND', 'No existe la solicitud');
    sendOk(res, s);
  });

  router.post('/solicitudes', coordinador, validate({ body: SolicitudCrear }), async (req, res) => {
    const b = req.body as z.infer<typeof SolicitudCrear>;
    if (F.detectarSolapes(b.franjas).length > 0) {
      throw AppError.unprocessable('FRANJAS_SOLAPADAS', 'Hay franjas que se solapan');
    }
    const id = await withTransaction(db, async (trx) => {
      const [fila] = await trx('solicitudes')
        .insert({
          estudiante_id: b.estudianteId,
          materia_id: b.materiaId,
          tema: b.tema ?? null,
          duracion_sesion_min: b.duracionSesionMin,
          preferencias: JSON.stringify(b.preferencias),
          creada_por: currentUser(req).id,
        })
        .returning('id');
      await trx('solicitud_franjas').insert(
        b.franjas.map((f) => ({
          solicitud_id: fila.id,
          dia: f.dia,
          hora_inicio: f.inicio,
          hora_fin: f.fin,
        })),
      );
      return fila.id as string;
    });
    sendCreated(res, (await cargar(db, { id }))[0]);
  });

  router.post(
    '/solicitudes/:id/cancelar',
    coordinador,
    validate({ params: IdParams }),
    async (req, res) => {
      const id = String(req.params.id);
      await cambiarEstado(db, id, 'ABIERTA', 'CANCELADA');
      sendOk(res, (await cargar(db, { id }))[0]);
    },
  );

  const api = {
    async obtenerParaMatching(id: string) {
      const [s] = await cargar(db, { id });
      if (!s) return null;
      return {
        solicitudId: s.id,
        estado: s.estado,
        estudianteId: s.estudianteId,
        estudianteNombre: s.estudianteNombre,
        materiaId: s.materiaId,
        materiaNombre: s.materiaNombre,
        duracionSesionMin: s.duracionSesionMin,
        franjas: s.franjas,
        preferencias: s.preferencias,
      };
    },
    marcarAsignada: (id: string, trx: Trx) => cambiarEstado(trx, id, 'ABIERTA', 'ASIGNADA'),
    reabrir: (id: string, trx: Trx) => cambiarEstado(trx, id, 'ASIGNADA', 'ABIERTA'),
  };

  return { router, api };
}

export type SolicitudesModule = ReturnType<typeof createSolicitudesModule>;
