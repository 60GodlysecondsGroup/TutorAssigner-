/**
 * Entorno de test del módulo sobre FAKES de los puertos (Tutores y Solicitudes) y la BD de test.
 * `createTestApp()` monta el módulo con los adaptadores reales (hoy stubs 501), así que aquí se
 * arma la misma plataforma HTTP + sesión de coordinador con `createRecomendacionesCore` y fakes.
 */
import supertest from 'supertest';
import { configV1 } from '@tutorias/contracts/matching/fixtures';
import { createLogger } from '../../../platform/logger';
import { createHttpApp } from '../../../platform/http';
import type { Db } from '../../../platform/db';
import { ensureTestUser, getTestDb, testConfig, truncate } from '../../../../test/helpers';
import { createAuthModule } from '../../auth';
import { createRecomendacionesCore } from '../core';
import { solicitudesDemo, tutoresDemo } from '../fakes/datos';
import { createSolicitudesFake } from '../fakes/solicitudes.fake';
import { createTutoresFake, type TutorFake } from '../fakes/tutores.fake';
import type { SolicitudParaMatching } from '../ports';

export const TABLAS = [
  'asignaciones',
  'recomendacion_candidatos',
  'recomendaciones',
  'matching_config',
];

export async function limpiar(db: Db) {
  await truncate(db, ...TABLAS);
}

export async function sembrarConfigV1(db: Db) {
  await db('matching_config').insert({
    version: 1,
    pesos: JSON.stringify(configV1.pesos),
    parametros: JSON.stringify(configV1.parametros),
    vigente: true,
  });
}

/** Ocupa `n` plazas del tutor con asignaciones activas de solicitudes ficticias. */
export async function ocuparCupo(db: Db, tutorId: string, n = 1) {
  for (let i = 0; i < n; i++) {
    await db('asignaciones').insert({
      solicitud_id: db.raw('gen_random_uuid()'),
      tutor_id: tutorId,
      estado: 'ACTIVA',
    });
  }
}

export async function crearEntorno(
  opciones: { tutores?: TutorFake[]; solicitudes?: SolicitudParaMatching[] } = {},
) {
  const db = getTestDb();
  const config = testConfig();
  const tutores = createTutoresFake(opciones.tutores ?? tutoresDemo());
  const solicitudes = createSolicitudesFake(opciones.solicitudes ?? solicitudesDemo());
  const core = createRecomendacionesCore({ db, tutores, solicitudes });
  const auth = createAuthModule({ db, config });
  const app = createHttpApp({
    config,
    db,
    logger: createLogger(config),
    mount: (a) => a.use('/api/v1', auth.requireAuth, core.router),
  });

  const usuario = await ensureTestUser(db);
  const cookie = `${auth.session.cookieName}=${auth.session.sign({ id: usuario.id, rol: usuario.rol })}`;
  const agent = supertest(app);
  const conSesion = (t: supertest.Test) => t.set('Cookie', cookie);

  return {
    db,
    tutores,
    solicitudes,
    usuario,
    request: {
      get: (url: string) => conSesion(agent.get(url)),
      post: (url: string) => conSesion(agent.post(url)),
      put: (url: string) => conSesion(agent.put(url)),
      patch: (url: string) => conSesion(agent.patch(url)),
    },
    anonimo: agent,
  };
}

export type Entorno = Awaited<ReturnType<typeof crearEntorno>>;
