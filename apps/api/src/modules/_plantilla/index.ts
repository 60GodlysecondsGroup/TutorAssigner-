/**
 * Módulo de referencia para copiar (Dev 1). No se registra en `app.ts`.
 * `index.ts` es la única puerta de entrada: otros módulos solo importan desde aquí.
 *
 *   createXModule({ db }) → { router, api }
 */
import type { Db } from '../../platform/db';
import { createPlantillaController } from './plantilla.controller';
import { createPlantillaPublicApi } from './plantilla.public';
import { createPlantillaRepository } from './plantilla.repository';
import { createPlantillaRouter } from './plantilla.routes';
import { createPlantillaService } from './plantilla.service';

export function createPlantillaModule({ db }: { db: Db }) {
  const service = createPlantillaService({ repo: createPlantillaRepository(db) });
  const router = createPlantillaRouter(createPlantillaController(service));
  const api = createPlantillaPublicApi(db);
  return { router, api };
}

export type PlantillaModule = ReturnType<typeof createPlantillaModule>;
export type { PlantillaPublicApi } from './plantilla.public';
