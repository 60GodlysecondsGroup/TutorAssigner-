/**
 * Test de integración de referencia: rutas reales + BD de test + sesión (createTestApp).
 * Copia este patrón: Supertest contra el API, respuesta validada contra el contrato y
 * limpieza SOLO de las tablas del módulo.
 *
 * La plantilla no tiene migración propia (no es un módulo del producto): crea su tabla aquí.
 * Un módulo real usa las tablas que crean sus migraciones (aplicadas en el setup global).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { pageEnvelope } from '@tutorias/contracts/common';
import { addUpdatedAtTrigger, timestamps, uuidPrimaryKey } from '@tutorias/database/helpers';
import {
  closeTestDb,
  createTestApp,
  getTestDb,
  truncate,
  type TestApp,
} from '../../../../test/helpers';
import { createPlantillaModule } from '../index';
import { TABLA_EJEMPLOS } from '../plantilla.repository';
import { Ejemplo } from '../plantilla.schemas';

describe('Plantilla (integración)', () => {
  const db = getTestDb();
  let t: TestApp;

  beforeAll(async () => {
    await db.schema.dropTableIfExists(TABLA_EJEMPLOS);
    await db.schema.createTable(TABLA_EJEMPLOS, (tb) => {
      uuidPrimaryKey(db, tb);
      tb.text('nombre').notNullable();
      tb.boolean('activo').notNullable().defaultTo(true);
      timestamps(db, tb);
    });
    await db.raw(
      `CREATE UNIQUE INDEX ux_${TABLA_EJEMPLOS}_nombre ON ${TABLA_EJEMPLOS} (lower(nombre))`,
    );
    await addUpdatedAtTrigger(db, TABLA_EJEMPLOS);
    t = await createTestApp({ extraRouters: [createPlantillaModule({ db }).router] });
  });

  beforeEach(async () => {
    await truncate(db, TABLA_EJEMPLOS);
  });

  afterAll(async () => {
    await db.schema.dropTableIfExists(TABLA_EJEMPLOS);
    await closeTestDb();
  });

  it('POST crea (201) y GET por id lo devuelve según el contrato', async () => {
    const creado = await t.request.post('/api/v1/ejemplos').send({ nombre: '  Álgebra  ' });
    expect(creado.status).toBe(201);
    const ejemplo = Ejemplo.parse(creado.body.data);
    expect(ejemplo.nombre).toBe('Álgebra');

    const leido = await t.request.get(`/api/v1/ejemplos/${ejemplo.id}`);
    expect(leido.status).toBe(200);
    expect(leido.body.data).toEqual(ejemplo);
  });

  it('GET lista paginada con { data, meta } y búsqueda literal', async () => {
    for (const nombre of ['Calculo I', 'Calculo II', 'Fisica', '100%_real']) {
      await t.request.post('/api/v1/ejemplos').send({ nombre });
    }
    const res = await t.request.get('/api/v1/ejemplos?q=CALCULO&pageSize=1&page=2');
    expect(res.status).toBe(200);
    const page = pageEnvelope(Ejemplo).parse(res.body);
    expect(page.meta).toEqual({ page: 2, pageSize: 1, total: 2 });
    expect(page.data[0]?.nombre).toBe('Calculo II');

    const literal = await t.request.get('/api/v1/ejemplos?q=%25_');
    expect(literal.body.meta.total).toBe(1);
  });

  it('PATCH actualiza y mantiene updated_at', async () => {
    const { body } = await t.request.post('/api/v1/ejemplos').send({ nombre: 'Química' });
    const res = await t.request.patch(`/api/v1/ejemplos/${body.data.id}`).send({ activo: false });
    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(false);
    expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(body.data.updatedAt).getTime(),
    );
  });

  it('errores: 400 forma, 404 inexistente, 409 duplicado, 422 regla de negocio', async () => {
    expect((await t.request.post('/api/v1/ejemplos').send({ nombre: '' })).status).toBe(400);
    expect((await t.request.get('/api/v1/ejemplos/no-es-uuid')).status).toBe(400);

    const inexistente = await t.request.get(
      '/api/v1/ejemplos/6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d',
    );
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error.code).toBe('EJEMPLO_NOT_FOUND');

    const { body } = await t.request.post('/api/v1/ejemplos').send({ nombre: 'Biologia' });
    const dup = await t.request.post('/api/v1/ejemplos').send({ nombre: 'BIOLOGIA' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('EJEMPLO_DUPLICADO');

    await t.request.patch(`/api/v1/ejemplos/${body.data.id}`).send({ activo: false });
    const regla = await t.request.patch(`/api/v1/ejemplos/${body.data.id}`).send({ nombre: 'Bio' });
    expect(regla.status).toBe(422);
    expect(regla.body.error.code).toBe('EJEMPLO_INACTIVO');
  });

  it('sin sesión → 401', async () => {
    const anon = await createTestApp({
      as: 'anonimo',
      extraRouters: [createPlantillaModule({ db }).router],
    });
    expect((await anon.request.get('/api/v1/ejemplos')).status).toBe(401);
  });

  it('API pública: una sola consulta para varios ids', async () => {
    const a = (await t.request.post('/api/v1/ejemplos').send({ nombre: 'A' })).body.data;
    const b = (await t.request.post('/api/v1/ejemplos').send({ nombre: 'B' })).body.data;
    const nombres = await createPlantillaModule({ db }).api.obtenerNombres([a.id, b.id]);
    expect(nombres).toEqual({ [a.id]: 'A', [b.id]: 'B' });
  });
});
