/**
 * Test unitario de referencia: el servicio con un repositorio EN MEMORIA (sin BD ni Express).
 * Copia este patrón: un caso por regla de negocio y por código de error.
 */
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlantillaRepository } from '../plantilla.repository';
import type { Ejemplo } from '../plantilla.schemas';
import { createPlantillaService } from '../plantilla.service';

function createInMemoryRepo(): PlantillaRepository {
  const items = new Map<string, Ejemplo>();
  return {
    async listar({ page, pageSize, q, activo }) {
      const all = [...items.values()]
        .filter((e) => !q || e.nombre.toLowerCase().includes(q.toLowerCase()))
        .filter((e) => activo === undefined || e.activo === activo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length };
    },
    obtener: async (id) => items.get(id),
    obtenerVarios: async (ids) => ids.flatMap((id) => items.get(id) ?? []),
    existeNombre: async (nombre, excluirId) =>
      [...items.values()].some(
        (e) => e.nombre.toLowerCase() === nombre.toLowerCase() && e.id !== excluirId,
      ),
    async crear({ nombre }) {
      const now = new Date().toISOString();
      const e: Ejemplo = { id: randomUUID(), nombre, activo: true, createdAt: now, updatedAt: now };
      items.set(e.id, e);
      return e;
    },
    async actualizar(id, cambios) {
      const actual = items.get(id);
      if (!actual) return undefined;
      const e = { ...actual, ...cambios, updatedAt: new Date().toISOString() };
      items.set(id, e);
      return e;
    },
  };
}

describe('PlantillaService', () => {
  let service: ReturnType<typeof createPlantillaService>;

  beforeEach(() => {
    service = createPlantillaService({ repo: createInMemoryRepo() });
  });

  it('crea y obtiene un ejemplo', async () => {
    const creado = await service.crear({ nombre: 'Cálculo' });
    await expect(service.obtener(creado.id)).resolves.toEqual(creado);
  });

  it('rechaza nombres duplicados sin distinguir mayúsculas (409)', async () => {
    await service.crear({ nombre: 'Cálculo' });
    await expect(service.crear({ nombre: 'cálculo' })).rejects.toMatchObject({
      status: 409,
      code: 'EJEMPLO_DUPLICADO',
    });
  });

  it('404 si no existe', async () => {
    await expect(service.obtener(randomUUID())).rejects.toMatchObject({
      status: 404,
      code: 'EJEMPLO_NOT_FOUND',
    });
  });

  it('no renombra un ejemplo inactivo (422) salvo que se reactive a la vez', async () => {
    const e = await service.crear({ nombre: 'Física' });
    await service.editar(e.id, { activo: false });
    await expect(service.editar(e.id, { nombre: 'Física II' })).rejects.toMatchObject({
      status: 422,
      code: 'EJEMPLO_INACTIVO',
    });
    await expect(
      service.editar(e.id, { nombre: 'Física II', activo: true }),
    ).resolves.toMatchObject({
      nombre: 'Física II',
      activo: true,
    });
  });

  it('lista paginado y filtrado', async () => {
    for (const nombre of ['A', 'B', 'C']) await service.crear({ nombre });
    const res = await service.listar({ page: 2, pageSize: 2 });
    expect(res.total).toBe(3);
    expect(res.items.map((e) => e.nombre)).toEqual(['C']);
  });
});
