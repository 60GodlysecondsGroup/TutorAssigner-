import type { RouteObject } from 'react-router';
import { LoginPage } from './pages/LoginPage';

/** Rutas públicas de la feature (fuera de `RequireAuth`). */
export const authPublicRoutes: RouteObject[] = [{ path: '/login', element: <LoginPage /> }];
