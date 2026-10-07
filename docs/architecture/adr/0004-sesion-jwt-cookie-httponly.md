# ADR-0004 · Sesión con JWT en cookie httpOnly

- **Estado:** Aceptado (F9) · **Fecha:** 2026-10-07 · **Dueño:** Dev 1

## Contexto

En el MVP solo inicia sesión el coordinador (S-12); PV-02 puede abrir más roles.

## Decisión

- Login con bcrypt (costo configurable, 12 por defecto). Mismo error `AUTH_INVALID_CREDENTIALS` para
  correo inexistente, contraseña incorrecta o usuario inactivo, y comparación contra un hash ficticio
  para igualar tiempos.
- JWT HS256 (`iss`, `aud`, `exp`, `sub` = id, `rol`) en la cookie `tutorias_session`: `httpOnly`,
  `SameSite=Lax`, `Secure` en producción, duración `SESSION_TTL_SECONDS` (8 h). El token no lleva datos
  personales; `GET /auth/me` los consulta y rechaza usuarios desactivados.
- `requireAuth` en `app.ts` para todo `/api/v1` salvo `/auth/login`; `/health` es público.
  `requireRole(...)` se declara por ruta. No existe ningún flag que desactive la autenticación.
- Rate limit de intentos fallidos de login por IP (`LOGIN_RATE_LIMIT_MAX` cada 15 min, 429
  `AUTH_RATE_LIMITED`). `TRUST_PROXY` fija cuántos proxies son de confianza para obtener la IP real.
- En producción el API no arranca sin `JWT_SECRET` de ≥ 32 caracteres.
- En el navegador: `AuthProvider` (estado en la caché de TanStack Query vía `/auth/me`), `RequireAuth`,
  `RequireRole`; un 401 en cualquier petición lleva a /login con «sesión expirada».

## Consecuencias

- Sesión stateless: un token emitido sigue válido en las rutas de negocio hasta expirar aunque el
  usuario se desactive (sí se rechaza en `/auth/me`). Si se necesita revocación inmediata: verificar
  `activo` en `requireAuth` o una lista de revocación (Hardening).
- CSRF: mitigado por `SameSite=Lax` y porque las mutaciones solo aceptan JSON.
