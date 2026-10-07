# ADR-0005 · Docker Compose multicontenedor

- **Estado:** Aceptado (F2/F12) · **Fecha:** 2026-10-07 · **Dueño:** Dev 1

## Decisión

- Desarrollo: `db` (postgres:17-alpine) → `migrate` (job: migraciones + seeds) → `api` → `web`. Un
  proceso por contenedor. Perfiles `test` (`db-test` en tmpfs + `api-test`) y `e2e` (imagen oficial de
  Playwright, misma versión que `@playwright/test`).
- Una imagen multietapa `docker/node.Dockerfile`: `base` → `deps` → `dev` | `build` → `prod`. La etapa
  `dev` sirve a `migrate`, `api` y `web`; el código entra por bind mount y `node_modules` vive en
  volúmenes con nombre (binarios Linux separados del host). Si cambia el `package-lock.json`, el
  entrypoint de `migrate` sincroniza las dependencias sin borrar volúmenes.
- Producción (`compose.prod.yaml`): `app` (Express sirve el API y el build de Vite) + `db` + job
  `migrate` solo con seeds base. Imagen sin dependencias de desarrollo y con usuario no root. Los
  secretos llegan por entorno y Compose no arranca si faltan.

## Consecuencias

- `docker compose up` en un clon limpio levanta todo sin instalar nada fuera de Docker.
- El navegador solo habla con `web:5173`, que reenvía `/api` (sin CORS en desarrollo); en producción
  la SPA y el API comparten origen.
