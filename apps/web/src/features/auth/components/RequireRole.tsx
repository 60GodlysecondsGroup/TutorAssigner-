import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import type { Rol } from '@tutorias/contracts/auth';
import { useAuth } from '../context/AuthProvider';

/**
 * Restringe una ruta a ciertos roles (se declara por ruta en el manifiesto de cada feature).
 * Debe ir dentro de `RequireAuth`. Sin permiso muestra «sin permiso» (equivalente al 403).
 */
export function RequireRole({ roles, children }: { roles: Rol[]; children?: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return (
      <section role="alert" style={{ padding: '2rem' }}>
        <h1>Sin permiso</h1>
        <p>Tu usuario no tiene permiso para ver esta página.</p>
      </section>
    );
  }
  return children ?? <Outlet />;
}
