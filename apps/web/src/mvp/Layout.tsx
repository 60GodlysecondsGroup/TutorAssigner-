import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../features/auth';

const MENU = [
  ['/', 'Inicio'],
  ['/solicitudes', 'Solicitudes'],
  ['/tutores', 'Tutores'],
  ['/estudiantes', 'Estudiantes'],
  ['/asignaciones', 'Asignaciones'],
  ['/configuracion', 'Pesos del matching'],
] as const;

export function Layout() {
  const { usuario, logout } = useAuth();
  return (
    <div className="app">
      <header className="barra">
        <strong>🎓 Tutorías entre pares</strong>
        <nav>
          {MENU.map(([to, texto]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {texto}
            </NavLink>
          ))}
        </nav>
        <span className="usuario">
          {usuario?.nombre}{' '}
          <button type="button" className="secundario" onClick={() => void logout()}>
            Salir
          </button>
        </span>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
