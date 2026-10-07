import type { ConfigMatching } from '@tutorias/contracts/matching';
import type { DbOrTrx } from '../../platform/db';
import type { ConfigRow } from './recomendaciones.mapper';

/** Único código que toca `matching_config`. */
export interface ConfigRepository {
  obtenerVigente(): Promise<ConfigRow | undefined>;
  /** Serializa la creación de versiones (lock consultivo de transacción). */
  bloquearVersionado(): Promise<void>;
  siguienteVersion(): Promise<number>;
  desmarcarVigente(): Promise<void>;
  insertarVigente(datos: {
    version: number;
    pesos: ConfigMatching['pesos'];
    parametros: ConfigMatching['parametros'];
    creadaPor: string | null;
  }): Promise<ConfigRow>;
}

const COLUMNAS = ['id', 'version', 'pesos', 'parametros', 'vigente', 'creada_por', 'created_at'];

export function createConfigRepository(db: DbOrTrx): ConfigRepository {
  return {
    async obtenerVigente() {
      return db<ConfigRow>('matching_config').where({ vigente: true }).first(COLUMNAS);
    },
    async bloquearVersionado() {
      await db.raw("SELECT pg_advisory_xact_lock(hashtextextended('matching_config', 0))");
    },
    async siguienteVersion() {
      const fila = await db('matching_config')
        .max<{ max: number | null }>('version as max')
        .first();
      return (fila?.max ?? 0) + 1;
    },
    async desmarcarVigente() {
      await db('matching_config').where({ vigente: true }).update({ vigente: false });
    },
    async insertarVigente({ version, pesos, parametros, creadaPor }) {
      const [fila] = await db('matching_config')
        .insert({
          version,
          pesos: JSON.stringify(pesos),
          parametros: JSON.stringify(parametros),
          vigente: true,
          creada_por: creadaPor,
        })
        .returning(COLUMNAS);
      return fila as ConfigRow;
    },
  };
}
