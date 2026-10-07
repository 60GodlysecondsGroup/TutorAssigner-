/**
 * Módulo Tutores y Materias — versión MVP de demo en un solo archivo (dueño: Dev 2).
 * Rutas: /materias, /tutores. API pública: listarCandidatos(materiaId), obtenerResumenes(ids).
 */
import { Router } from 'express';
import { IdParams } from '@tutorias/contracts/common';
import type { FranjaHoraria } from '@tutorias/contracts/matching';
import {
  TutorActualizar,
  TutorCrear,
  type Tutor,
  type TutorParaMatching,
  type TutorResumenPublico,
} from '@tutorias/contracts/tutores';
import { franjas as F } from '@tutorias/matching';
import { requireRole } from '../../platform/auth';
import { withTransaction, type Db, type DbOrTrx } from '../../platform/db';
import { AppError, sendCreated, sendOk, validate } from '../../platform/http';

const hhmm = (t: string) => t.slice(0, 5);

type TutorRow = {
  id: string;
  nombre: string;
  email: string;
  programa: string | null;
  nivel_prioridad: 1 | 2 | 3 | 4 | 5;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'AMBAS';
  capacidad_maxima: number;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
};

async function franjasPorTutor(db: DbOrTrx, ids: string[]) {
  const filas = ids.length
    ? await db('tutor_franjas').whereIn('tutor_id', ids).orderBy(['dia', 'hora_inicio'])
    : [];
  return (id: string): FranjaHoraria[] =>
    filas
      .filter((f) => f.tutor_id === id)
      .map((f) => ({ dia: f.dia, inicio: hhmm(f.hora_inicio), fin: hhmm(f.hora_fin) }));
}

async function cargar(db: DbOrTrx, filtro?: { id?: string; materiaId?: string }): Promise<Tutor[]> {
  const q = db<TutorRow>('tutores').orderBy('nombre');
  if (filtro?.id) q.where({ id: filtro.id });
  if (filtro?.materiaId) {
    q.whereIn(
      'id',
      db('tutor_materias').where({ materia_id: filtro.materiaId }).select('tutor_id'),
    );
  }
  const tutores: TutorRow[] = await q;
  const ids = tutores.map((t) => t.id);
  const materias = ids.length
    ? await db('tutor_materias as tm')
        .join('materias as m', 'm.id', 'tm.materia_id')
        .whereIn('tm.tutor_id', ids)
        .select('tm.tutor_id', 'tm.materia_id', 'tm.nivel_dominio', 'm.codigo', 'm.nombre')
    : [];
  const franjas = await franjasPorTutor(db, ids);
  return tutores.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    email: t.email,
    programa: t.programa,
    nivelPrioridad: t.nivel_prioridad,
    modalidad: t.modalidad,
    capacidadMaxima: t.capacidad_maxima,
    activo: t.activo,
    materias: materias
      .filter((m) => m.tutor_id === t.id)
      .map((m) => ({
        materiaId: m.materia_id,
        nivelDominio: m.nivel_dominio,
        codigo: m.codigo,
        nombre: m.nombre,
      })),
    franjas: franjas(t.id),
    createdAt: t.created_at.toISOString(),
    updatedAt: t.updated_at.toISOString(),
  }));
}

function validarFranjas(lista: FranjaHoraria[]) {
  if (F.detectarSolapes(lista).length > 0) {
    throw AppError.unprocessable('FRANJAS_SOLAPADAS', 'Hay franjas que se solapan', [
      { path: 'franjas', message: 'Las franjas no pueden solaparse' },
    ]);
  }
}

export function createTutoresModule({ db }: { db: Db }) {
  const router = Router();
  const coordinador = requireRole('COORDINADOR');

  router.get('/materias', coordinador, async (_req, res) => {
    sendOk(res, await db('materias').orderBy('nombre').select('id', 'codigo', 'nombre', 'activa'));
  });

  router.get('/tutores', coordinador, async (_req, res) => {
    sendOk(res, await cargar(db));
  });

  router.get('/tutores/:id', coordinador, validate({ params: IdParams }), async (req, res) => {
    const [tutor] = await cargar(db, { id: String(req.params.id) });
    if (!tutor) throw AppError.notFound('TUTORES_NOT_FOUND', 'No existe el tutor');
    sendOk(res, tutor);
  });

  router.post('/tutores', coordinador, validate({ body: TutorCrear }), async (req, res) => {
    const body = TutorCrear.parse(req.body);
    validarFranjas(body.franjas);
    const id = await withTransaction(db, async (trx) => {
      const [fila] = await trx('tutores')
        .insert({
          nombre: body.nombre,
          email: body.email,
          programa: body.programa ?? null,
          nivel_prioridad: body.nivelPrioridad,
          modalidad: body.modalidad,
          capacidad_maxima: body.capacidadMaxima,
        })
        .returning('id');
      if (body.materias.length) {
        await trx('tutor_materias').insert(
          body.materias.map((m) => ({
            tutor_id: fila.id,
            materia_id: m.materiaId,
            nivel_dominio: m.nivelDominio,
          })),
        );
      }
      if (body.franjas.length) {
        await trx('tutor_franjas').insert(
          body.franjas.map((f) => ({
            tutor_id: fila.id,
            dia: f.dia,
            hora_inicio: f.inicio,
            hora_fin: f.fin,
          })),
        );
      }
      return fila.id as string;
    });
    sendCreated(res, (await cargar(db, { id }))[0]);
  });

  router.patch(
    '/tutores/:id',
    coordinador,
    validate({ params: IdParams, body: TutorActualizar }),
    async (req, res) => {
      const b = req.body as TutorActualizar;
      const cambios = Object.fromEntries(
        Object.entries({
          nombre: b.nombre,
          email: b.email,
          programa: b.programa,
          nivel_prioridad: b.nivelPrioridad,
          modalidad: b.modalidad,
          capacidad_maxima: b.capacidadMaxima,
          activo: b.activo,
        }).filter(([, v]) => v !== undefined),
      );
      const id = String(req.params.id);
      if (Object.keys(cambios).length) await db('tutores').where({ id }).update(cambios);
      const [tutor] = await cargar(db, { id });
      if (!tutor) throw AppError.notFound('TUTORES_NOT_FOUND', 'No existe el tutor');
      sendOk(res, tutor);
    },
  );

  const api = {
    async listarCandidatos(materiaId: string): Promise<TutorParaMatching[]> {
      const tutores: (TutorRow & { nivel_dominio: 1 | 2 | 3 | 4 | 5 })[] = await db('tutores as t')
        .join('tutor_materias as tm', 'tm.tutor_id', 't.id')
        .join('materias as m', 'm.id', 'tm.materia_id')
        .where({ 'tm.materia_id': materiaId, 't.activo': true, 'm.activa': true })
        .orderBy('t.id')
        .select('t.*', 'tm.nivel_dominio');
      const franjas = await franjasPorTutor(
        db,
        tutores.map((t) => t.id),
      );
      return tutores.map((t) => ({
        tutorId: t.id,
        nombre: t.nombre,
        nivelPrioridad: t.nivel_prioridad,
        nivelDominio: t.nivel_dominio,
        modalidad: t.modalidad,
        franjas: franjas(t.id),
        capacidadMaxima: t.capacidad_maxima,
      }));
    },

    async obtenerResumenes(ids: string[]): Promise<TutorResumenPublico[]> {
      if (!ids.length) return [];
      const filas: TutorRow[] = await db('tutores').whereIn('id', ids);
      return filas.map((t) => ({
        tutorId: t.id,
        nombre: t.nombre,
        email: t.email,
        nivelPrioridad: t.nivel_prioridad,
        modalidad: t.modalidad,
        activo: t.activo,
      }));
    },
  };

  return { router, api };
}

export type TutoresModule = ReturnType<typeof createTutoresModule>;
