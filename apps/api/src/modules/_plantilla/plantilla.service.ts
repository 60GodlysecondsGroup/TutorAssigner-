/**
 * Casos de uso y reglas de negocio. No conoce Express: recibe comandos tipados y devuelve DTOs
 * o lanza `AppError`. Si un caso de uso escribe en varias tablas, abre la transacción aquí
 * (`withTransaction`) y crea el repositorio con la `trx`.
 */
import type { Ejemplo, EditarEjemploRequest, ListarEjemplosQuery } from './plantilla.schemas';
import { ejemploDuplicado, ejemploInactivo, ejemploNoEncontrado } from './plantilla.errors';
import type { PlantillaRepository } from './plantilla.repository';

export type PlantillaService = ReturnType<typeof createPlantillaService>;

export function createPlantillaService({ repo }: { repo: PlantillaRepository }) {
  return {
    listar(query: ListarEjemplosQuery) {
      return repo.listar(query);
    },

    async obtener(id: string): Promise<Ejemplo> {
      const ejemplo = await repo.obtener(id);
      if (!ejemplo) throw ejemploNoEncontrado(id);
      return ejemplo;
    },

    async crear(datos: { nombre: string }): Promise<Ejemplo> {
      if (await repo.existeNombre(datos.nombre)) throw ejemploDuplicado();
      return repo.crear(datos);
    },

    async editar(id: string, cambios: EditarEjemploRequest): Promise<Ejemplo> {
      const actual = await repo.obtener(id);
      if (!actual) throw ejemploNoEncontrado(id);
      if (cambios.nombre !== undefined) {
        // Regla de ejemplo: un registro inactivo no se renombra (salvo que se reactive a la vez).
        if (!actual.activo && cambios.activo !== true) throw ejemploInactivo();
        if (await repo.existeNombre(cambios.nombre, id)) throw ejemploDuplicado();
      }
      const actualizado = await repo.actualizar(id, cambios);
      if (!actualizado) throw ejemploNoEncontrado(id);
      return actualizado;
    },
  };
}
