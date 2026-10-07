/**
 * Sesión del usuario (AuthContext, Dev 1). La fuente de verdad es `GET /auth/me` en la caché de
 * TanStack Query. Un 401 en cualquier petición marca la sesión como expirada y `RequireAuth`
 * redirige a /login.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginRequest, Rol, Usuario } from '@tutorias/contracts/auth';
import { onUnauthorized } from '../../../shared/api';
import { authApi } from '../api/auth.api';
import { authKeys, useMeQuery } from '../api/auth.queries';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export type AuthContextValue = {
  status: AuthStatus;
  usuario: Usuario | null;
  /** true si la sesión terminó por un 401 (no por logout). */
  sessionExpired: boolean;
  login(credenciales: LoginRequest): Promise<Usuario>;
  logout(): Promise<void>;
  hasRole(...roles: Rol[]): boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const me = useMeQuery();
  const [sessionExpired, setSessionExpired] = useState(false);

  /** Borra los datos de la sesión anterior y deja `me` en null. */
  const clearSession = useCallback(() => {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== authKeys.all[0] });
    queryClient.setQueryData(authKeys.me(), null);
  }, [queryClient]);

  useEffect(
    () =>
      onUnauthorized(() => {
        if (queryClient.getQueryData(authKeys.me())) setSessionExpired(true);
        clearSession();
      }),
    [queryClient, clearSession],
  );

  const login = useCallback(
    async (credenciales: LoginRequest) => {
      const usuario = await authApi.login(credenciales);
      clearSession();
      queryClient.setQueryData(authKeys.me(), usuario);
      setSessionExpired(false);
      return usuario;
    },
    [queryClient, clearSession],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setSessionExpired(false);
    clearSession();
  }, [clearSession]);

  const usuario = me.data ?? null;
  const status: AuthStatus = me.isPending ? 'loading' : usuario ? 'authenticated' : 'anonymous';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      usuario,
      sessionExpired,
      login,
      logout,
      hasRole: (...roles) => usuario !== null && roles.includes(usuario.rol),
    }),
    [status, usuario, sessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
