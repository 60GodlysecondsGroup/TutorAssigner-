/**
 * Composición interna del módulo sobre puertos. `index.ts` la usa con los adaptadores reales;
 * los tests, con los fakes (`fakes/`).
 */
import { Router } from 'express';
import type { Db } from '../../platform/db';
import { createAsignacionesController } from './asignaciones.controller';
import { registrarRutasAsignaciones } from './asignaciones.routes';
import { createAsignacionesService } from './asignaciones.service';
import { createConfigController } from './config.controller';
import { registrarRutasConfig } from './config.routes';
import { createConfigService } from './config.service';
import type { Puertos } from './ports';
import { createRecomendacionesController } from './recomendaciones.controller';
import { registrarRutasRecomendaciones } from './recomendaciones.routes';
import { createRecomendacionesService } from './recomendaciones.service';

export function createRecomendacionesCore({ db, tutores, solicitudes }: Puertos & { db: Db }) {
  const config = createConfigService({ db });
  const recomendaciones = createRecomendacionesService({ db, tutores, solicitudes, config });
  const asignaciones = createAsignacionesService({ db, tutores, solicitudes });

  const router = Router();
  registrarRutasRecomendaciones(router, createRecomendacionesController(recomendaciones));
  registrarRutasAsignaciones(router, createAsignacionesController(asignaciones));
  registrarRutasConfig(router, createConfigController(config));

  return { router, services: { config, recomendaciones, asignaciones } };
}
