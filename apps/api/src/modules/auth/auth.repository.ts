import type { DbOrTrx } from '../../platform/db';
import { toRecord, type UsuarioRecord, type UsuarioRow } from './auth.mapper';

/** Único código que toca la tabla `usuarios`. */
export interface AuthRepository {
  findByEmail(email: string): Promise<UsuarioRecord | undefined>;
  findById(id: string): Promise<UsuarioRecord | undefined>;
}

export function createAuthRepository(db: DbOrTrx): AuthRepository {
  return {
    async findByEmail(email) {
      const row = await db<UsuarioRow>('usuarios')
        .whereRaw('lower(email) = ?', [email.trim().toLowerCase()])
        .first();
      return row ? toRecord(row) : undefined;
    },
    async findById(id) {
      const row = await db<UsuarioRow>('usuarios').where({ id }).first();
      return row ? toRecord(row) : undefined;
    },
  };
}
