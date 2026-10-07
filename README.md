# Tutorías entre pares — Matching

Sistema web que registra tutores y solicitudes, calcula un score de compatibilidad con criterios
ponderados y recomienda al mejor tutor con una justificación breve.

- **Stack:** React + Vite · Node.js + Express · PostgreSQL 17 · Docker Compose · TypeScript · monorepo con npm workspaces.
- **Arquitectura:** monolito modular. Plan completo en
  [docs/architecture/](docs/architecture/Plan%20arquitect%C3%B3nico%20%E2%80%94%20Matching%20de%20tutor%C3%ADas%20entre%20pares.md);
  decisiones en [docs/architecture/adr/](docs/architecture/adr/); convenciones en [docs/conventions.md](docs/conventions.md).

## Primeros 10 minutos

Solo necesitas **Docker** (Docker Desktop en Windows/macOS). No hace falta instalar Node ni PostgreSQL.

```bash
git clone https://github.com/60GodlysecondsGroup/TutorAssigner-.git
cd TutorAssigner-
cp .env.example .env      # opcional: sin .env se usan los mismos valores de desarrollo
docker compose up
```

`docker compose up` levanta, en orden:

| Servicio  | Qué hace                                                           | URL                     |
| --------- | ------------------------------------------------------------------ | ----------------------- |
| `db`      | PostgreSQL 17 (base `tutorias` y `tutorias_test`)                  | `localhost:5432`        |
| `migrate` | Aplica migraciones y seeds y termina (si falla, el API no arranca) | —                       |
| `api`     | Express con recarga automática                                     | `http://localhost:3000` |
| `web`     | Vite; reenvía `/api` al API (sin CORS)                             | `http://localhost:5173` |

Abre <http://localhost:5173> e inicia sesión con el coordinador de desarrollo (`ADMIN_EMAIL` /
`ADMIN_PASSWORD` de `.env.example`): `coordinador@tutorias.local` / `coordinador-dev-123`.

Comprobaciones rápidas:

```bash
curl http://localhost:3000/health/ready      # {"data":{"status":"ok","checks":{"db":"ok"}}}
docker compose ps                            # db y api "healthy", migrate "exited (0)"
```

## Comandos del día a día

```text
docker compose up                                        levantar todo
docker compose logs -f api                               logs del API (JSON)
docker compose exec api npm test -w apps/api             tests del API (unitarios + integración)
docker compose exec web npm test -w apps/web             tests del frontend
docker compose --profile test run --rm api-test          tests del API contra una base efímera
docker compose --profile e2e run --rm e2e                E2E con Playwright (con el stack levantado)
docker compose run --rm migrate npm run migrate:make -w database -- tutores_agrega_capacidad
docker compose down -v                                   reiniciar la base (borra los datos)
```

Con Node 22 en el host (opcional, para el editor y para correr lint/tests rápidos):

```bash
npm ci
npm run lint && npm run typecheck && npm run test:unit
```

## Estructura

```text
apps/web            SPA React + Vite (features en src/features/<feature>)
apps/api            API Express (módulos en src/modules/<modulo>, plataforma en src/platform)
packages/contracts  Esquemas Zod compartidos: @tutorias/contracts/<modulo>
packages/matching   Motor de matching puro (sin Express ni SQL)
database            Migraciones Knex (una por archivo y módulo), seeds y runner
docker              Dockerfile multietapa (dev, build, prod) e init de PostgreSQL
tests/e2e           Playwright
docs                Arquitectura, ADR, convenciones y SPEC.md por módulo
```

Cada carpeta tiene un dueño declarado en [.github/CODEOWNERS](.github/CODEOWNERS).

## Problemas frecuentes

- **Windows:** usa WSL2 y clona el repo dentro del sistema de archivos de Linux. Si la recarga en
  caliente no detecta cambios, pon `WATCH_POLLING=true` en `.env`.
- **El puerto 5432 está ocupado** (PostgreSQL local): cambia `DB_HOST_PORT` en `.env`.
- **Linux:** pon `HOST_UID` y `HOST_GID` (`id -u`, `id -g`) en `.env` para que los archivos generados
  (p. ej. migraciones nuevas) no queden a nombre de otro usuario.
- **Cambié dependencias:** `docker compose up` las sincroniza solo (el servicio `migrate` detecta el
  cambio del `package-lock.json`). Si cambió el Dockerfile: `docker compose build`.

## Producción

```bash
POSTGRES_USER=… POSTGRES_PASSWORD=… JWT_SECRET=… ADMIN_EMAIL=… ADMIN_PASSWORD=… \
  docker compose -f compose.prod.yaml up -d --build
```

Dos servicios (`app` sirve el API y el build de Vite; `db`) más el job `migrate`. La imagen corre
sin dependencias de desarrollo y con usuario no root. Compose no arranca si falta un secreto, y el
API se niega a arrancar si `JWT_SECRET` tiene menos de 32 caracteres. Puerto por defecto: `8080`.
