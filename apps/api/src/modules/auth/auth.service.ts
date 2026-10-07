import type { Usuario } from '@tutorias/contracts/auth';
import { AppError } from '../../platform/http';
import type { SessionService } from '../../platform/auth';
import { credencialesInvalidas } from './auth.errors';
import { toUsuario } from './auth.mapper';
import type { AuthRepository } from './auth.repository';
import type { PasswordHasher } from './password';

export type AuthService = {
  /** Valida credenciales y emite el token de sesión. Mismo error para correo, contraseña o usuario inactivo. */
  login(email: string, password: string): Promise<{ usuario: Usuario; token: string }>;
  /** Usuario de la sesión actual; 401 si ya no existe o fue desactivado. */
  me(usuarioId: string): Promise<Usuario>;
};

export function createAuthService(deps: {
  repo: AuthRepository;
  passwords: PasswordHasher;
  session: Pick<SessionService, 'sign'>;
}): AuthService {
  const { repo, passwords, session } = deps;

  return {
    async login(email, password) {
      const record = await repo.findByEmail(email);
      if (!record) {
        await passwords.verifyDummy(password);
        throw credencialesInvalidas();
      }
      const ok = await passwords.verify(password, record.passwordHash);
      if (!ok || !record.activo) throw credencialesInvalidas();

      const token = session.sign({ id: record.id, rol: record.rol });
      return { usuario: toUsuario(record), token };
    },

    async me(usuarioId) {
      const record = await repo.findById(usuarioId);
      if (!record || !record.activo) throw AppError.unauthenticated('La sesión ya no es válida');
      return toUsuario(record);
    },
  };
}
