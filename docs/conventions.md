# Convenciones (personas y LLMs)

Dueño: Dev 1. Entrégale este archivo a tu LLM junto con tu `docs/modules/<modulo>/SPEC.md`, tus
contratos y el módulo `apps/api/src/modules/_plantilla`. Instrucción explícita para el LLM:
**no tocar rutas fuera de tu ownership** ([CODEOWNERS](../.github/CODEOWNERS)).

## 1. Idioma y nombres

- Dominio en **español** (`tutores`, `solicitudes`, `nivelPrioridad`); términos técnicos en inglés
  cuando son estándar (`router`, `service`, `repository`, `mapper`).
- TypeScript estricto. Archivos `kebab-case` o `<modulo>.<capa>.ts`; componentes React `PascalCase.tsx`.
- JSON del API y DTOs en `camelCase`; columnas de PostgreSQL en `snake_case`. El mapper traduce.
- Códigos de error: `MAYUSCULAS_CON_GUION_BAJO`, prefijados por el módulo (`TUTOR_NOT_FOUND`).

## 2. Contratos (`packages/contracts`)

- Un esquema Zod es la **única** fuente de verdad de una forma: valida en Express, valida formularios
  en React, genera los tipos y verifica respuestas en los tests de contrato.
- Se importa por subruta: `@tutorias/contracts/<modulo>` y `@tutorias/contracts/<modulo>/fixtures`.
  No existe un `index.ts` central: crea `src/<modulo>/index.ts` y `src/<modulo>/fixtures.ts`.
- Cada esquema tiene un fixture válido y uno inválido, con test.
- Formato común (`@tutorias/contracts/common`): `{ data }`, `{ data, meta: { page, pageSize, total } }`,
  `{ error: { code, message, details?, requestId } }`. Ids UUID. Fechas ISO 8601 UTC.
  Paginación `?page=1&pageSize=20` (máx. 100) con `PaginationQuery`.
- Cambio aditivo (campo opcional nuevo): PR normal con revisión del consumidor. Quitar, renombrar o
  cambiar el tipo de un campo: etiqueta `contrato`, aprobación de todos los consumidores y fixtures
  actualizados en el mismo PR. Un desajuste se corrige en el contrato, nunca en el consumidor.

## 3. Backend (`apps/api`)

Copia `src/modules/_plantilla` (está documentado archivo por archivo):

```text
modules/<modulo>/
├── index.ts               create<Modulo>Module({ db, ... }) → { router, api }   (única puerta de entrada)
├── <modulo>.routes.ts     método + URL + validate(esquemas) + requireRole
├── <modulo>.controller.ts req → caso de uso → sendOk/sendCreated/sendPage/sendNoContent
├── <modulo>.service.ts    reglas de negocio, transacciones; lanza AppError
├── <modulo>.repository.ts interfaz + implementación Knex; único código que toca tus tablas
├── <modulo>.mapper.ts     fila ↔ DTO
├── <modulo>.public.ts     API pública para otros módulos
├── <modulo>.errors.ts     códigos de error del módulo
└── __tests__/             *.test.ts (unitarios) y *.int.test.ts (integración con BD)
```

Reglas:

1. Un módulo solo importa de otro su `index.ts`; nunca escribe ni hace JOIN sobre tablas ajenas
   (una FK sí está permitida). ESLint lo hace cumplir.
2. Registra rutas solo bajo tu prefijo (`/tutores`, `/solicitudes`…). Declara `requireRole('COORDINADOR')`
   **en cada ruta** (no con `router.use` sin path: los routers comparten `/api/v1`).
3. La autenticación ya está aplicada en `app.ts` a todo `/api/v1`. El usuario está en
   `currentUser(req)` (`{ id, rol }`); úsalo para `creada_por`.
4. Validación de forma con `validate({ body, query, params })` y los esquemas del contrato. Validación de
   negocio en el servicio con `AppError`:
   - `AppError.notFound('<MODULO>_NOT_FOUND', …)` → 404
   - `AppError.conflict('<CODIGO>', …)` → 409 (regla de estado)
   - `AppError.unprocessable('<CODIGO>', …, details)` → 422 (regla de negocio sobre datos bien formados)
   - Errores de PostgreSQL `23505`/`23503` ya se traducen a `409 CONFLICT`/`REFERENCE_CONFLICT`.
5. Transacciones en el servicio: `withTransaction(db, async (trx) => { const repo = createXRepository(trx); … })`.
   Una API pública que participa de una transacción ajena recibe la `trx` como parámetro.
6. Paginación: `paginate(query, { page, pageSize })` de `platform/db` + `sendPage(res, items, pageMeta(query, total))`.
7. Nunca loguees cuerpos, contraseñas, tokens ni datos personales. Usa `req.log` (pino) con metadatos.

## 4. Base de datos (`database/`)

- Una migración por cambio: `docker compose run --rm migrate npm run migrate:make -w database -- <modulo>_<cambio>`
  → `AAAAMMDDHHMMSS_<modulo>_<cambio>.ts`. Una migración mergeada **nunca** se edita.
- Usa los helpers: `uuidPrimaryKey`, `timestamps`, `addUpdatedAtTrigger` (`database/helpers.ts`).
- Estados con `text` + `CHECK` (no `ENUM`). Índices únicos de email sobre `lower(email)`.
- Cada migración tiene `down`. CI aplica todo desde cero, revierte y vuelve a aplicar.
- Seeds idempotentes (se ejecutan en cada `up`): `01_admin`, `02_materias`, `03_config` en todos los
  entornos; los que empiezan por `10_` o más son de demo y solo corren con `SEED_DEMO=true`.

## 5. Frontend (`apps/web`)

- Una carpeta por feature con `index.ts` (API pública), `routes.tsx`, `api/<feature>.api.ts`,
  `api/<feature>.queries.ts` (hooks de TanStack Query + fábrica de query keys), `pages/`, `components/`,
  `mocks/handlers.ts` (MSW con fixtures del contrato) y tests `*.test.tsx`.
- Una feature solo importa de otra su `index.ts` (ESLint). HTTP solo con `shared/api` (`request`,
  `requestPage`, `ApiError`). Formularios con React Hook Form + `zodResolver(<esquema del contrato>)`.
- Sesión: `useAuth()` de `features/auth`; rutas privadas dentro de `RequireAuth`, roles con `RequireRole`.
- El frontend nunca recalcula scores: muestra lo que devuelve el API.
- Ninguna variable `VITE_*` lleva secretos.

## 6. Tests

| Tipo        | Dónde                          | Cómo                                                                       |
| ----------- | ------------------------------ | -------------------------------------------------------------------------- |
| Unitario    | `*.test.ts(x)` junto al código | Servicio con repositorio en memoria; componentes con Testing Library + MSW |
| Integración | `*.int.test.ts`                | `createTestApp()` (API real + BD de test + sesión de coordinador)          |
| Contrato    | En los de integración          | `Esquema.parse(res.body)` con el esquema de `@tutorias/contracts`          |
| E2E         | `tests/e2e/specs`              | Playwright contra el stack de Compose                                      |

Helpers del API en `apps/api/test/helpers`: `createTestApp({ as?: 'coordinador' | 'anonimo' })`,
`getTestDb()`, `closeTestDb()`, `truncate(db, ...tusTablas)`. Limpia **solo** tus tablas.

## 7. Git y PRs

- Trunk-based. Ramas `<modulo>/<tipo>-<descripcion>` (`tutores/feat-franjas`), de vida corta, rebasadas
  sobre `main` a diario. Trabajo incompleto: detrás de `enabled: false` o del stub del módulo.
- Título del PR (squash): `tipo(modulo): resumen` — `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.
- ~400 líneas por PR (sin lockfile, fixtures ni migraciones); máximo un archivo sensible por PR.
- Dependencia nueva: PR propio y pequeño. Conflicto en `package-lock.json`: regenerar con `npm install`.
- Antes de pedir revisión: `npm run format && npm run lint && npm run typecheck && npm test`.

## 8. Archivos sensibles (un cambio a la vez, revisión de Dev 1 o Dev 5 en el shell web)

`package.json` y `package-lock.json` raíz · `compose*.yaml` · `docker/` · `apps/api/src/app.ts` ·
`apps/web/src/app/` · `apps/web/src/mocks/` · `packages/contracts/src/common` · `tsconfig.base.json` ·
`eslint.config.js` · `.env.example` · `.github/`.
