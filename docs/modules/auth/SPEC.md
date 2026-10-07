# SPEC — Auth

## Contexto

Protege el sistema para el coordinador (S-12) y queda preparado para más roles (PV-02). Fase F9.
Dueño: Dev 1. Decisión de diseño: [ADR-0004](../../architecture/adr/0004-sesion-jwt-cookie-httponly.md).

## Alcance

- API: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; `requireAuth`, `requireRole`; rate limit
  de login; seed `01_admin`; `createTestApp()` autenticado por defecto.
- Web: página `/login`, `AuthProvider` (`useAuth`), `RequireAuth`, `RequireRole`, handlers MSW.

Fuera de alcance: alta/edición de usuarios desde la UI, recuperación de contraseña, SSO (S-14),
cuentas de estudiante o tutor (PV-02).

## Ownership

`apps/api/src/modules/auth/`, `apps/api/src/platform/auth/`, `apps/web/src/features/auth/`,
`packages/contracts/src/auth/`, `database/migrations/*_auth_*`, `database/seeds/01_admin.ts`.

## Contratos

`@tutorias/contracts/auth`: `LoginRequest { email, password }`, `Usuario { id, email, nombre, rol }`,
`Rol = 'COORDINADOR'`, `SESSION_COOKIE = 'tutorias_session'`, `AuthErrorCode`.

| Método | Ruta (`/api/v1`) | Entrada        | Salida                                     | Errores                                                                         |
| ------ | ---------------- | -------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| POST   | `/auth/login`    | `LoginRequest` | `200 { data: Usuario }` + cookie de sesión | 400 `VALIDATION_ERROR`, 401 `AUTH_INVALID_CREDENTIALS`, 429 `AUTH_RATE_LIMITED` |
| POST   | `/auth/logout`   | cookie         | `204` y borra la cookie                    | 401 `UNAUTHENTICATED`                                                           |
| GET    | `/auth/me`       | cookie         | `200 { data: Usuario }`                    | 401 `UNAUTHENTICATED`                                                           |

Para otros módulos: `currentUser(req)` → `{ id, rol }` (p. ej. para `creada_por`) y
`requireRole('COORDINADOR')` en cada ruta. En la web: `useAuth()` → `{ status, usuario, login, logout, hasRole, sessionExpired }`.

## Datos

Tabla `usuarios` (`id`, `email`, `nombre`, `password_hash`, `rol` con `CHECK`, `activo`, `created_at`,
`updated_at`); índice único `ux_usuarios_email` sobre `lower(email)`.

## Reglas

1. El correo se normaliza (trim + minúsculas) y se compara sin distinguir mayúsculas.
2. Correo inexistente, contraseña incorrecta y usuario inactivo devuelven el mismo 401 y el mismo mensaje.
3. La contraseña y su hash nunca aparecen en respuestas ni logs; el token tampoco se loguea.
4. Cookie `httpOnly`, `SameSite=Lax`, `Secure` en producción; expira en `SESSION_TTL_SECONDS`.
5. Sin cookie válida: 401 en todo `/api/v1` salvo `/auth/login`; `/health` es público. Rol incorrecto: 403.
6. En producción el API no arranca sin `JWT_SECRET` (≥ 32 caracteres).
7. Más de `LOGIN_RATE_LIMIT_MAX` intentos fallidos por IP en 15 minutos → 429.
8. Un 401 en cualquier petición del navegador cierra la sesión local y lleva a /login con «Tu sesión expiró».

## Pruebas

- Contrato: fixtures válidos e inválidos (`packages/contracts/src/auth/auth.test.ts`).
- Unitarias: servicio con repositorio en memoria; firma/verificación del token (alterado, expirado,
  otro secreto, `alg: none`); `requireAuth`/`requireRole` (401/403); config de producción.
- Integración: login (cookie y contrato), me, logout, credenciales inválidas, validación, usuario
  desactivado, rate limit, logs sin secretos.
- Web: redirección a /login y vuelta al origen, error de credenciales, validación en cliente, estado de
  carga, logout, sesión expirada, «sin permiso».
- E2E (`tests/e2e/specs/auth.spec.ts`): redirección, error, login → recarga → logout.

## DoD (F9)

- [x] Sin cookie: 401 en todo salvo `/auth/login` y `/health`; rol incorrecto: 403.
- [x] La contraseña y su hash nunca aparecen en respuestas ni logs.
- [x] En producción el API no arranca sin `JWT_SECRET`.
- [x] Login y logout probados en UI e integración.

## Cómo correrlo

```bash
docker compose up        # login en http://localhost:5173 con ADMIN_EMAIL / ADMIN_PASSWORD
docker compose exec api npm test -w apps/api
docker compose exec web npm test -w apps/web
docker compose --profile e2e run --rm e2e
```
