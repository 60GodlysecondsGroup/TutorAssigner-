/**
 * Feature auth (Dev 1) — API pública para el shell y las demás features.
 * Otras features importan solo desde aquí.
 */
export {
  AuthProvider,
  useAuth,
  type AuthContextValue,
  type AuthStatus,
} from './context/AuthProvider';
export { RequireAuth, type LoginLocationState } from './components/RequireAuth';
export { RequireRole } from './components/RequireRole';
export { LoginPage } from './pages/LoginPage';
export { authPublicRoutes } from './routes';
export { authKeys } from './api/auth.queries';
