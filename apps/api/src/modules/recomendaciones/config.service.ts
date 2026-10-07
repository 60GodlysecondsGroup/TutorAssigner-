/** Configuración versionada de pesos (RN-R04). */
import { diagnosticarConfig } from '@tutorias/matching';
import type {
  ActualizarConfigRequest,
  ConfiguracionMatching,
} from '@tutorias/contracts/recomendaciones';
import type { ConfigMatching } from '@tutorias/contracts/matching';
import { withTransaction, type Db, type DbOrTrx } from '../../platform/db';
import { createConfigRepository } from './config.repository';
import { configNoEncontrada, pesosInvalidos } from './recomendaciones.errors';
import { toConfigMotor, toConfiguracion } from './recomendaciones.mapper';

export type ConfigService = ReturnType<typeof createConfigService>;

export function createConfigService({ db }: { db: Db }) {
  return {
    async obtenerVigente(): Promise<ConfiguracionMatching> {
      const fila = await createConfigRepository(db).obtenerVigente();
      if (!fila) throw configNoEncontrada();
      return toConfiguracion(fila);
    },

    /** Configuración vigente en la forma que consume el motor, con su id para persistirla. */
    async vigenteParaMotor(conn: DbOrTrx = db): Promise<{ id: string; config: ConfigMatching }> {
      const fila = await createConfigRepository(conn).obtenerVigente();
      if (!fila) throw configNoEncontrada();
      return { id: fila.id, config: toConfigMotor(fila) };
    },

    /**
     * Crea una versión nueva y la deja vigente; la anterior queda intacta (vigente = false).
     * Pesos que no suman 1 o parámetros < 1 → 422 PESOS_INVALIDOS con el detalle.
     */
    async crearVersion(
      { pesos, parametros }: ActualizarConfigRequest,
      usuarioId: string | null,
    ): Promise<ConfiguracionMatching> {
      const problemas = diagnosticarConfig({ version: 1, pesos, parametros });
      if (problemas.length > 0) throw pesosInvalidos(problemas);

      return withTransaction(db, async (trx) => {
        const repo = createConfigRepository(trx);
        await repo.bloquearVersionado();
        const version = await repo.siguienteVersion();
        await repo.desmarcarVigente();
        const fila = await repo.insertarVigente({
          version,
          pesos,
          parametros,
          creadaPor: usuarioId,
        });
        return toConfiguracion(fila);
      });
    },
  };
}
