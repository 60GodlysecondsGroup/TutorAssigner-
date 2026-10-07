import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthProvider';

export type LoginLocationState = { from?: string; expired?: boolean };

/**
 * Envuelve el layout autenticado: sin sesión redirige a /login recordando la ruta de origen.
 * Sin `children` renderiza el `<Outlet />` de las rutas anidadas.
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status, sessionExpired } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <p role="status" aria-live="polite" style={{ padding: '2rem' }}>
        Cargando sesión…
      </p>
    );
  }
  if (status === 'anonymous') {
    const state: LoginLocationState = {
      from: `${location.pathname}${location.search}`,
      expired: sessionExpired,
    };
    return <Navigate to="/login" replace state={state} />;
  }
  return children ?? <Outlet />;
}
