/**
 * Shell de la SPA. Versión MVP de demo: rutas de `src/mvp` dentro del área autenticada.
 * Dev 5 lo reemplaza por el router con manifiestos de features, el layout y el kit de UI (F3).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider, RequireAuth, authPublicRoutes } from '../features/auth';
import { AsignacionesPage } from '../mvp/AsignacionesPage';
import { ConfiguracionPage } from '../mvp/ConfiguracionPage';
import { EstudiantesPage } from '../mvp/EstudiantesPage';
import { InicioPage } from '../mvp/InicioPage';
import { Layout } from '../mvp/Layout';
import { RecomendacionPage } from '../mvp/RecomendacionPage';
import { SolicitudesPage } from '../mvp/SolicitudesPage';
import { TutoresPage } from '../mvp/TutoresPage';
import '../mvp/mvp.css';

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
              <Route element={<Layout />}>
                <Route index element={<InicioPage />} />
                <Route path="solicitudes" element={<SolicitudesPage />} />
                <Route path="solicitudes/:id/recomendacion" element={<RecomendacionPage />} />
                <Route path="tutores" element={<TutoresPage />} />
                <Route path="estudiantes" element={<EstudiantesPage />} />
                <Route path="asignaciones" element={<AsignacionesPage />} />
                <Route path="configuracion" element={<ConfiguracionPage />} />
                <Route path="*" element={<InicioPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
