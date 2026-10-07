import { paginate, type DbOrTrx } from '../../platform/db';
import { toEjemplo, type EjemploRow } from './plantilla.mapper';
import type { Ejemplo, ListarEjemplosQuery } from './plantilla.schemas';

export const TABLA_EJEMPLOS = 'plantilla_ejemplos';

/**
 * Interfaz del repositorio: el servicio depende de ella, no de Knex. Así los tests unitarios
 * usan una implementación en memoria. Único código que toca las tablas del módulo.
 */
export interface PlantillaRepository {
  listar(query: ListarEjemplosQuery): Promise<{ items: Ejemplo[]; total: number }>;
  obtener(id: string): Promise<Ejemplo | undefined>;
  obtenerVarios(ids: string[]): Promise<Ejemplo[]>;
  existeNombre(nombre: string, excluirId?: string): Promise<boolean>;
  crear(datos: { nombre: string }): Promise<Ejemplo>;
  actualizar(
    id: string,
    cambios: { nombre?: string; activo?: boolean },
  ): Promise<Ejemplo | undefined>;
}

export function createPlantillaRepository(db: DbOrTrx): PlantillaRepository {
  return {
    async listar({ page, pageSize, q, activo }) {
      const query = db<EjemploRow>(TABLA_EJEMPLOS)
        .select('*')
        .orderBy([
          { column: 'nombre', order: 'asc' },
          { column: 'id', order: 'asc' },
        ]);
      if (q) query.whereILike('nombre', `%${escapeLike(q)}%`);
      if (activo !== undefined) query.where({ activo });
      const { rows, total } = await paginate<EjemploRow>(query, { page, pageSize });
      return { items: rows.map(toEjemplo), total };
    },

    async obtener(id) {
      const row = await db<EjemploRow>(TABLA_EJEMPLOS).where({ id }).first();
      return row ? toEjemplo(row) : undefined;
    },

    async obtenerVarios(ids) {
      if (ids.length === 0) return [];
      const rows = await db<EjemploRow>(TABLA_EJEMPLOS).whereIn('id', ids);
      return rows.map(toEjemplo);
    },

    async existeNombre(nombre, excluirId) {
      const query = db(TABLA_EJEMPLOS).whereRaw('lower(nombre) = lower(?)', [nombre]);
      if (excluirId) query.whereNot({ id: excluirId });
      return Boolean(await query.first('id'));
    },

    async crear(datos) {
      const [row] = await db<EjemploRow>(TABLA_EJEMPLOS).insert(datos).returning('*');
      return toEjemplo(row as EjemploRow);
    },

    async actualizar(id, cambios) {
      const [row] = await db<EjemploRow>(TABLA_EJEMPLOS)
        .where({ id })
        .update(cambios)
        .returning('*');
      return row ? toEjemplo(row as EjemploRow) : undefined;
    },
  };
}

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
