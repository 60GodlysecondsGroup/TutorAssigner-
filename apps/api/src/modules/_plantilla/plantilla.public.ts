/**
 * API pública para otros módulos: lo único que pueden usar (vía `index.ts`). Devuelve DTOs del
 * contrato, nunca filas ni el repositorio. Si una operación participa de una transacción ajena,
 * recibe la `trx` como parámetro (p. ej. `marcarAsignada(id, trx)` en Solicitudes).
 */
import type { DbOrTrx } from '../../platform/db';
import { createPlantillaRepository } from './plantilla.repository';

export function createPlantillaPublicApi(db: DbOrTrx) {
  return {
    async obtenerNombres(ids: string[]): Promise<Record<string, string>> {
      // Una sola consulta para todos los ids: nunca N+1.
      const encontrados = await createPlantillaRepository(db).obtenerVarios(ids);
      return Object.fromEntries(encontrados.map((e) => [e.id, e.nombre]));
    },
  };
}

export type PlantillaPublicApi = ReturnType<typeof createPlantillaPublicApi>;
