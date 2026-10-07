/** Placeholder del área autenticada hasta que Dev 5 entregue el layout y el dashboard (F3/F8). */
import { useAuth } from '../features/auth';

export function BootstrapHome() {
  const { usuario, logout } = useAuth();
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Tutorías entre pares</h1>
      <p>
        Sesión iniciada como <strong>{usuario?.nombre}</strong> ({usuario?.email}).
      </p>
      <p>El shell con navegación y las features llega en F3.</p>
      <button type="button" onClick={() => void logout()}>
        Cerrar sesión
      </button>
    </main>
  );
}
