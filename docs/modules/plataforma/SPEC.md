# SPEC — Plataforma (backend, Docker, CI)

## Contexto

Base transversal para que cada módulo solo escriba su lógica (fases F0, F2, F11 y F12 del plan).
Dueño: Dev 1. Cubre RC-09 (stack) y las reglas transversales de las secciones 9, 13 y 14.

## Alcance

- Monorepo con npm workspaces (`apps/api`, `apps/web`, `packages/contracts`, `packages/matching`, `database`).
- Config validada con Zod (`apps/api/src/platform/config.ts`), logs JSON con pino, conexión Knex,
  helpers de transacción y paginación.
- HTTP: `requestId`, `validate`, `AppError`, sobre estándar, middleware de errores y 404, helmet,
  límite de payload, health checks.
- Composición en `app.ts` con todos los módulos pre-registrados (stubs 501 hasta que su dueño los implemente).
- Runner de migraciones/seeds, helpers de migración, BD de test, `createTestApp()`, módulo `_plantilla`.
- Docker (dev y prod), Compose, CI, CODEOWNERS, plantilla de PR, convenciones.

Fuera de alcance: lógica de dominio de Tutores, Solicitudes, Matching y Recomendaciones; shell web (Dev 5).

## Ownership

`apps/api/src/{app.ts,server.ts,platform/}`, `apps/api/src/modules/_plantilla/`, `apps/api/test/`,
`database/{knexfile.ts,helpers.ts,scripts/}`, `database/migrations/*_plataforma_*`, `docker/`,
`compose*.yaml`, `.github/`, archivos de la raíz, `docs/{architecture,conventions.md}`.

## Contratos

Expone a los módulos (`apps/api/src/platform/*`):

| Pieza                                                                                                  | Uso                                                               |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `validate({ body, query, params })`                                                                    | Valida forma con Zod; reemplaza `req.*` por los valores parseados |
| `AppError` (`notFound`, `conflict`, `unprocessable`, `unauthenticated`, `forbidden`, `notImplemented`) | Errores tipados → sobre estándar                                  |
| `sendOk`, `sendCreated`, `sendPage`, `sendNoContent`, `pageMeta`                                       | Respuestas con el sobre                                           |
| `requireRole(...)`, `currentUser(req)`                                                                 | Autorización por ruta y usuario de la sesión                      |
| `Db`, `Trx`, `DbOrTrx`, `withTransaction`, `paginate`                                                  | Acceso a datos                                                    |
| `createTestApp`, `getTestDb`, `closeTestDb`, `truncate`                                                | Tests                                                             |
| `uuidPrimaryKey`, `timestamps`, `addUpdatedAtTrigger`                                                  | Migraciones                                                       |

Endpoints: `GET /health` (liveness) y `GET /health/ready` (readiness, 503 si la BD no responde).

## Errores

| Origen                        | HTTP      | Código                                        |
| ----------------------------- | --------- | --------------------------------------------- |
| `ZodError` / JSON mal formado | 400       | `VALIDATION_ERROR` (`details[].path`)         |
| Sin sesión / sin rol          | 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN`               |
| Ruta inexistente              | 404       | `NOT_FOUND`                                   |
| PostgreSQL 23505 / 23503      | 409       | `CONFLICT` / `REFERENCE_CONFLICT`             |
| Cuerpo > `BODY_LIMIT`         | 413       | `PAYLOAD_TOO_LARGE`                           |
| Módulo stub                   | 501       | `NOT_IMPLEMENTED`                             |
| BD caída en readiness         | 503       | `SERVICE_UNAVAILABLE`                         |
| Cualquier otro                | 500       | `INTERNAL_ERROR` (sin stack hacia el cliente) |

Toda respuesta de error lleva `requestId` (igual a la cabecera `x-request-id` y al log).

## Pruebas

- Unitarias: config, sobre de errores, validación, requestId, 404, 413, health, cabeceras de seguridad.
- Integración: health con BD, 401 sin sesión en todo `/api/v1`, 501 de los stubs, 404, `_plantilla` completa.
- CI: formato, lint (fronteras), typecheck, unitarios, migraciones up/down/up, integración, build,
  imagen prod + smoke test; E2E bajo demanda (etiqueta `e2e`).

## DoD (F0 + F2)

- [x] `docker compose up` deja web, api y db sanos sin instalar nada fuera de Docker.
- [x] Las migraciones corren automáticamente antes de que arranque el API.
- [x] Un error de validación devuelve el sobre estándar con `requestId`.
- [x] `_plantilla` tiene un test unitario y uno de integración en verde.
- [x] README con «primeros 10 minutos».
- [ ] Protección de `main` (PR con aprobación + CI en verde) — se configura en GitHub, ver README.
- [ ] Cada desarrollador mergeó un PR trivial (verifica permisos y flujo).

## Cómo correrlo

```bash
docker compose up
docker compose exec api npm test -w apps/api
docker compose --profile test run --rm api-test
```
