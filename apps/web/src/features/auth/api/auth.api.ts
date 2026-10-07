/** Llamadas HTTP tipadas de auth, validadas con `@tutorias/contracts/auth`. */
import { Usuario, type LoginRequest } from '@tutorias/contracts/auth';
import { ApiError, request } from '../../../shared/api';

export const authApi = {
  async login(credenciales: LoginRequest): Promise<Usuario> {
    const data = await request<unknown>('/auth/login', {
      method: 'POST',
      body: credenciales,
      skipUnauthorizedHandler: true,
    });
    return Usuario.parse(data);
  },

  async logout(): Promise<void> {
    try {
      await request<void>('/auth/logout', { method: 'POST', skipUnauthorizedHandler: true });
    } catch (err) {
      // Sin sesión vigente ya estamos fuera: no es un error para el usuario.
      if (!(err instanceof ApiError && err.status === 401)) throw err;
    }
  },

  /** Usuario de la sesión actual, o `null` si no hay sesión. */
  async me(): Promise<Usuario | null> {
    try {
      return Usuario.parse(await request<unknown>('/auth/me', { skipUnauthorizedHandler: true }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
};
