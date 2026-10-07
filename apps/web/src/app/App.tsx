/**
 * Shell mínimo de bootstrap (F0/F9, Dev 1). Dueño del shell: Dev 5, que en F3 lo reemplaza por
 * el router con los manifiestos de todas las features, el layout, el kit de UI y MSW.
 * Aquí solo se cablea lo que auth necesita: providers, /login y el área protegida.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider, RequireAuth, authPublicRoutes } from '../features/auth';
import { BootstrapHome } from './BootstrapHome';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {authPublicRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
            <Route element={<RequireAuth />}>
              <Route path="*" element={<BootstrapHome />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
