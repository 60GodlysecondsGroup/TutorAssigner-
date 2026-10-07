import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { loginValido } from '@tutorias/contracts/auth/fixtures';
import { request } from '../../shared/api';
import { AuthProvider, RequireAuth, RequireRole, authPublicRoutes, useAuth } from './index';
import { authHandlers, resetAuthMock } from './mocks/handlers';

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => resetAuthMock(false));

function Privado() {
  const { usuario, logout } = useAuth();
  return (
    <div>
      <p>Hola {usuario?.nombre}</p>
      <button onClick={() => void logout()}>Salir</button>
      <button onClick={() => void request('/protegido').catch(() => undefined)}>Pedir datos</button>
    </div>
  );
}

function renderApp(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <Routes>
            {authPublicRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
            <Route element={<RequireAuth />}>
              <Route path="/privado" element={<Privado />} />
              <Route
                path="/restringido"
                element={
                  <RequireRole roles={[]}>
                    <p>Contenido restringido</p>
                  </RequireRole>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function completarLogin(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Correo'), email);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('feature auth', () => {
  it('sin sesión redirige a /login y, tras iniciar sesión, vuelve a la ruta de origen', async () => {
    renderApp('/privado');
    expect(
      await screen.findByRole('heading', { name: 'Tutorías entre pares' }),
    ).toBeInTheDocument();

    await completarLogin(loginValido.email, loginValido.password);

    expect(await screen.findByText('Hola Coordinación de Tutorías')).toBeInTheDocument();
  });

  it('credenciales incorrectas muestran un error y no navegan', async () => {
    renderApp('/login');
    await completarLogin(loginValido.email, 'incorrecta');
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(screen.queryByText(/Hola/)).not.toBeInTheDocument();
  });

  it('valida el formulario en el cliente sin llamar al API', async () => {
    let llamadas = 0;
    server.use(
      http.post('/api/v1/auth/login', () => {
        llamadas++;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderApp('/login');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Correo inválido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it('muestra el estado de carga mientras se envía', async () => {
    server.use(
      http.post('/api/v1/auth/login', async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderApp('/login');
    await completarLogin(loginValido.email, loginValido.password);
    expect(await screen.findByRole('button', { name: 'Ingresando…' })).toBeDisabled();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo iniciar sesión');
  });

  it('logout vuelve a /login', async () => {
    resetAuthMock(true);
    renderApp('/privado');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('un 401 en cualquier petición lleva a /login con «sesión expirada»', async () => {
    resetAuthMock(true);
    server.use(
      http.get('/api/v1/protegido', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHENTICATED', message: 'x', requestId: 'r' } },
          { status: 401 },
        ),
      ),
    );
    renderApp('/privado');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Pedir datos' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Tu sesión expiró'));
  });

  it('RequireRole sin el rol muestra «Sin permiso»', async () => {
    resetAuthMock(true);
    renderApp('/restringido');
    expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
    expect(screen.queryByText('Contenido restringido')).not.toBeInTheDocument();
  });
});
