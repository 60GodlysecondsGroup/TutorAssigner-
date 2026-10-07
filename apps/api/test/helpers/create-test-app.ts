/**
 * `createTestApp()`: el API completo contra la BD de test y AUTENTICADO por defecto como
 * coordinador, para que los tests de cada módulo no cambien al activar la autenticación real.
 *
 *   const t = await createTestApp();
 *   const res = await t.request.get('/api/v1/tutores');        // con sesión
 *   const anon = await createTestApp({ as: 'anonimo' });       // sin sesión
 */
import bcrypt from 'bcrypt';
import type { Router } from 'express';
import supertest from 'supertest';
import type { Usuario } from '@tutorias/contracts/auth';
import { createApp } from '../../src/app';
import { createSessionService } from '../../src/platform/auth';
import { loadConfig, type Config } from '../../src/platform/config';
import type { Db } from '../../src/platform/db';
import { createLogger, type Logger } from '../../src/platform/logger';
import { testDatabaseUrl } from './env';
import { getTestDb } from './test-db';

export const TEST_USER = {
  email: 'coordinador.test@tutorias.test',
  nombre: 'Coordinador de Test',
  password: 'test-password-123',
} as const;

export function testConfig(env: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: testDatabaseUrl(),
    JWT_SECRET: 'test-jwt-secret-solo-para-pruebas-automatizadas',
    BCRYPT_COST: '4',
    LOGIN_RATE_LIMIT_MAX: '1000',
    ...env,
  });
}

/** Crea (si no existe) el coordinador de test y lo devuelve. */
export async function ensureTestUser(db: Db): Promise<Usuario> {
  const existente = await db('usuarios').whereRaw('lower(email) = ?', [TEST_USER.email]).first();
  if (existente) {
    if (!existente.activo)
      await db('usuarios').where({ id: existente.id }).update({ activo: true });
    return {
      id: existente.id,
      email: existente.email,
      nombre: existente.nombre,
      rol: existente.rol,
    };
  }
  const [row] = await db('usuarios')
    .insert({
      email: TEST_USER.email,
      nombre: TEST_USER.nombre,
      password_hash: await bcrypt.hash(TEST_USER.password, 4),
      rol: 'COORDINADOR',
    })
    .returning(['id', 'email', 'nombre', 'rol']);
  return row as Usuario;
}

export type TestAppOptions = {
  as?: 'coordinador' | 'anonimo';
  db?: Db;
  env?: Record<string, string>;
  logger?: Logger;
  extraRouters?: Router[];
};

export async function createTestApp(options: TestAppOptions = {}) {
  const db = options.db ?? getTestDb();
  const config = testConfig(options.env);
  const logger = options.logger ?? createLogger(config);
  const app = createApp({ config, db, logger }, { extraRouters: options.extraRouters });

  let usuario: Usuario | undefined;
  let cookie: string | undefined;
  if ((options.as ?? 'coordinador') === 'coordinador') {
    usuario = await ensureTestUser(db);
    const session = createSessionService(config);
    cookie = `${session.cookieName}=${session.sign({ id: usuario.id, rol: usuario.rol })}`;
  }

  const withSession = (test: supertest.Test) => (cookie ? test.set('Cookie', cookie) : test);
  const agent = supertest(app);

  return {
    app,
    db,
    config,
    usuario,
    cookie,
    request: {
      get: (url: string) => withSession(agent.get(url)),
      post: (url: string) => withSession(agent.post(url)),
      put: (url: string) => withSession(agent.put(url)),
      patch: (url: string) => withSession(agent.patch(url)),
      delete: (url: string) => withSession(agent.delete(url)),
    },
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
