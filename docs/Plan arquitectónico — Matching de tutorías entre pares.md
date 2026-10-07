# Plan arquitectónico — Matching de tutorías entre pares

Oct 7, 2026 · @Cristian

## 1. Resumen del producto

El producto es un sistema web de matching para un programa de tutorías entre pares: registra tutores y solicitudes, calcula un score de compatibilidad con criterios ponderados y recomienda al mejor tutor con una justificación breve. Fuente: enunciado «S-2 · Eliminatoria 2 · El tutor perfecto para cada estudiante».

**Problema que resuelve.** Hoy el coordinador cruza a mano qué tutores están disponibles, qué materias dominan y en qué horarios pueden. Es lento y produce asignaciones poco óptimas porque no puede comparar todas las variables a la vez.

**Lectura de dimensionamiento.** El dominio es pequeño: cuatro capacidades confirmadas. Con 5 personas el riesgo no es la falta de trabajo, sino el exceso de coordinación. Por eso el plan prioriza contratos tempranos y aísla el motor de scoring como pieza independiente.

### Actores

| Actor | Papel en el sistema | Clasificación |
| --- | --- | --- |
| Coordinador del programa | Registra tutores y solicitudes, revisa la recomendación y confirma la asignación | Actor confirmado; que use el sistema directamente es **Supuesto** |
| Estudiante | Origina la solicitud de ayuda (materia, horario, preferencias) | Actor confirmado; que tenga cuenta propia es **Por validar** |
| Tutor (par) | Tiene un perfil con materias, horarios y prioridad | Entidad confirmada; que tenga cuenta propia es **Por validar** |

### Funcionalidades, entradas y salidas

| # | Funcionalidad | Entradas | Salidas | Origen |
| --- | --- | --- | --- | --- |
| F1 | Perfil de tutor | Datos básicos, materias que domina, franjas horarias, nivel de prioridad | Perfil persistido y consultable como candidato | Confirmado (punto 1) |
| F2 | Solicitud del estudiante | Estudiante, materia, franjas disponibles, preferencias | Solicitud persistida en estado abierta | Confirmado (punto 2) |
| F3 | Score de afinidad | Una solicitud, los tutores disponibles y los pesos | Puntaje por tutor con desglose por criterio | Confirmado (punto 3); escala y fórmula son Supuesto |
| F4 | Recomendación automática | Resultado del scoring | Tutor de mayor score + justificación breve | Confirmado (punto 4) |
| F5 | Confirmar asignación | Recomendación y tutor elegido | Asignación registrada; carga del tutor actualizada | Supuesto (el entregable habla de «la mejor asignación») |
| F6 | Configurar pesos | Peso por criterio | Nueva versión de configuración | Supuesto (deriva de «criterios ponderados») |

### Flujos principales

1. **Alta de tutor:** registrar datos → asignar materias con nivel de dominio → definir franjas semanales → fijar prioridad.
2. **Solicitud y recomendación (flujo central):** registrar o elegir estudiante → crear solicitud → el sistema filtra elegibles, calcula scores y muestra ranking con justificación → el coordinador confirma o elige una alternativa con motivo.
3. **Recalcular:** si cambian tutores o la solicitud, se genera una nueva recomendación y la anterior queda en el historial.

### Qué vive en cada lado

- **Frontend:** formularios de tutor y solicitud, selector de franjas semanales, listados con búsqueda, vista de ranking con desglose y justificación, confirmación, configuración de pesos, login.
- **Backend:** validación y persistencia de tutores y solicitudes, motor de scoring puro, orquestación de la recomendación, historial de resultados, asignaciones con control de concurrencia, autenticación.
- **Base de datos:** materias, tutores (dominio por materia, franjas, prioridad), estudiantes, solicitudes (franjas, preferencias), configuraciones de pesos versionadas, recomendaciones con ranking y desglose, asignaciones, usuarios.

### Dependencias entre funcionalidades

F3 necesita los datos de F1 y F2 y la definición de criterios. F4 depende de F3, y F5 de F4. F6 alimenta a F3. F1 y F2 son independientes entre sí; solo comparten el catálogo de materias.

## 2. Requisitos confirmados, supuestos y aspectos por validar

Solo ocho requisitos salen literalmente de la imagen; todo lo demás es un supuesto con decisión por defecto o una pregunta abierta. Los supuestos permiten empezar ya: si el equipo valida otra cosa, cambia el default sin rehacer la arquitectura.

### Requisitos confirmados

| ID | Requisito | Fuente |
| --- | --- | --- |
| RC-01 | Registrar perfiles de tutores con las materias que dominan | Punto 1 |
| RC-02 | Registrar los horarios disponibles de cada tutor | Punto 1 |
| RC-03 | Registrar un nivel de prioridad: los tutores con más experiencia tienen mayor peso | Punto 1 |
| RC-04 | Registrar solicitudes con materia, horario disponible y preferencias relevantes | Punto 2 |
| RC-05 | Comparar al estudiante con cada tutor disponible y calcular un puntaje de compatibilidad | Punto 3 |
| RC-06 | El matching usa múltiples criterios ponderados | Descripción del problema |
| RC-07 | Recomendar automáticamente al tutor de mayor score | Punto 4 y entregable |
| RC-08 | Acompañar la recomendación con una justificación breve | Punto 4 y entregable |
| RC-09 | Stack: React + Vite, Node.js + Express, PostgreSQL, Docker, monorepo, web | Definido por el equipo |

### Supuestos (decisión por defecto)

| ID | Supuesto | Por qué se asume |
| --- | --- | --- |
| S-01 | El coordinador es el usuario principal: registra tutores y solicitudes y confirma | Replica el proceso actual descrito en el enunciado |
| S-02 | La disponibilidad son franjas semanales recurrentes (día + hora inicio/fin), sin cruzar medianoche, en la zona horaria de la institución | Es el modelo más simple que permite calcular solapes |
| S-03 | La prioridad es un entero de 1 a 5 que fija el coordinador | El enunciado la llama «nivel» |
| S-04 | Cada materia dominada tiene un nivel de dominio de 1 a 5 | Da un criterio de calidad; si se descarta, queda solo como filtro |
| S-05 | Preferencias iniciales: modalidad (presencial o virtual) y tutor preferido; catálogo extensible | «Cualquier preferencia relevante» no está definida |
| S-06 | Score de 0 a 100 = suma ponderada de criterios normalizados entre 0 y 1; los pesos suman 1 | Hace el resultado comparable y explicable |
| S-07 | Filtros duros antes del score: tutor activo, domina la materia, comparte al menos un bloque de la duración de la sesión, tiene cupo | Evita recomendar a alguien que no puede atender |
| S-08 | La justificación se genera con plantillas deterministas a partir del desglose, sin IA externa | Reproducible, testeable y sin dependencias |
| S-09 | Además del recomendado se muestran las 2 o 3 mejores alternativas | Da contexto al coordinador |
| S-10 | El coordinador confirma la asignación y puede elegir una alternativa con motivo | «Recomendar» no implica asignar sin revisión |
| S-11 | Cada tutor tiene una capacidad máxima de asignaciones activas, que alimenta un criterio de balance de carga | Evita saturar siempre al mismo tutor |
| S-12 | En el MVP solo el coordinador inicia sesión | Reduce alcance |
| S-13 | Duración de sesión por defecto: 60 minutos | Necesaria para el filtro horario |
| S-14 | No hay integraciones externas (correo, calendario, SSO) | Nada en el enunciado las pide |

### Por validar con el equipo o el jurado

| ID | Pregunta | Qué cambia según la respuesta | Default mientras tanto |
| --- | --- | --- | --- |
| PV-01 | ¿Plazo y criterios de evaluación de la eliminatoria? | Alcance del MVP y peso del hardening | Priorizar flujo central + calidad del algoritmo |
| PV-02 | ¿Estudiantes y tutores tendrán cuenta propia? | Roles, vistas y autorización | S-12 |
| PV-03 | ¿Qué preferencias existen (modalidad, sede, idioma, tutor previo…)? | Contrato de preferencias y criterios del motor | S-05 |
| PV-04 | ¿La prioridad la fija el coordinador o se deriva de la experiencia (semestres, tutorías dadas)? | Campo manual o calculado | S-03 |
| PV-05 | ¿Horarios semanales recurrentes o fechas concretas? | Modelo de franjas y cálculo de solape | S-02 |
| PV-06 | ¿La asignación es automática o la confirma el coordinador? | Existencia del paso de confirmación | S-10 |
| PV-07 | ¿Los pesos son fijos o ajustables desde la interfaz? | Pantalla y API de configuración | Ajustables y versionados |
| PV-08 | ¿Un tutor puede ser también estudiante solicitante? | Regla para no asignarse a sí mismo | Tablas separadas; regla preparada |
| PV-09 | ¿Existe límite de carga por tutor? | Filtro de cupo y criterio de carga | S-11 |
| PV-10 | ¿Se notifica al tutor o al estudiante? | Integración de correo y eventos | No en el MVP |
| PV-11 | ¿Se usarán datos reales de personas? | Protección de datos (en Colombia, Ley 1581 de 2012) | Datos ficticios en demo |
| PV-12 | ¿TypeScript o JavaScript? | Tipado de contratos | TypeScript |

## 3. Stack tecnológico definitivo

El stack base no cambia: React + Vite, Node.js + Express, PostgreSQL y Docker, en un monorepo con npm workspaces. Las librerías de la tercera columna son complementos dentro de ese stack, no alternativas.

| Capa | Base obligatoria | Complementos propuestos | Para qué |
| --- | --- | --- | --- |
| Frontend | React + Vite (SPA web) | React Router, TanStack Query, React Hook Form, Zod, MSW, CSS Modules | Rutas por feature, estado de servidor sin store global, formularios validados con los mismos esquemas del backend, mocks de API |
| Backend | Node.js LTS + Express | Zod, Knex + pg, pino, bcrypt, jsonwebtoken, helmet, express-rate-limit | Validación, SQL explícito con migraciones y seeds, logs estructurados, seguridad básica |
| Base de datos | PostgreSQL (versión mayor fija, p. ej. 17) | `gen_random_uuid()` nativo | UUID como claves, CHECK y FK para integridad |
| Infraestructura | Docker + Docker Compose | npm workspaces | Entorno reproducible; un solo `npm ci` para todo el repo |
| Calidad | — | Vitest, Testing Library, Supertest, Playwright, fast-check, ESLint, Prettier, GitHub Actions (o el CI que use el equipo) | Tests unitarios, de integración, de contrato y E2E; reglas de fronteras entre módulos |
| Lenguaje | — | TypeScript (PV-12) | Contratos tipados entre 5 personas y 5 LLMs |

**Decisiones con impacto en el trabajo paralelo:**

- **Knex en lugar de un ORM con esquema único.** Herramientas como Prisma concentran el modelo en un solo archivo que los 5 tocarían a la vez. Knex usa una migración por archivo, así cada módulo agrega las suyas sin conflictos.
- **Zod como fuente única de contratos.** El mismo esquema valida en Express, valida formularios en React, genera los tipos y verifica respuestas en los tests de contrato.
- **npm workspaces sin Turborepo ni Nx.** Con cuatro paquetes no compensa otra herramienta.
- **Versiones fijadas.** Node.js LTS y PostgreSQL con versión mayor fija en `.nvmrc` y en las imágenes; nunca `latest`.
- **Si el equipo elige JavaScript (PV-12):** se mantienen los esquemas Zod y se tipa con JSDoc; el resto del plan no cambia.

## 4. Arquitectura propuesta

La arquitectura es un monolito modular: una SPA React, un único API Express dividido en módulos con fronteras explícitas, un motor de matching como librería pura y una base PostgreSQL. En desarrollo corre en tres contenedores (web, api, db) más un job de migraciones; en producción, en dos (app y db).

&#91;embedded content: arquitectura · SPA, API modular, motor puro y PostgreSQL\]

Las flechas van en una sola dirección: Recomendaciones usa la API pública de Tutores y Solicitudes y llama al motor; cada módulo escribe solo en sus propias tablas.

### Principios

1. **Un backend, módulos con dueño.** Cada módulo es dueño de sus tablas, de su prefijo de URL y de su carpeta. Otros módulos solo usan su API pública (`index.ts`), nunca sus tablas ni sus archivos internos.
2. **Motor de matching puro.** Vive en `packages/matching`, sin Express ni SQL. Es determinista, se prueba con fixtures y se desarrolla desde el día 1 sin esperar a nadie.
3. **Contratos como código.** Los esquemas Zod de `packages/contracts` son la fuente única para validación, formularios, tipos, mocks y tests de contrato.
4. **Puertos definidos por el consumidor.** Recomendaciones declara qué necesita de Tutores y Solicitudes y trabaja con fakes hasta la integración.
5. **Pre-cableado.** Todos los routers del API, las rutas del frontend y los handlers de mocks se registran en Foundation. Después nadie vuelve a tocar los archivos centrales.
6. **Sin microservicios, colas ni bus de eventos en el MVP.** El tamaño del dominio no lo justifica; queda un punto de extensión documentado (sección 9).

### Una sola implementación de cada lógica

| Lógica | Único lugar | Lo usan |
| --- | --- | --- |
| Franjas horarias: validación, solapes, minutos compartidos | `packages/matching/franjas` | Tutores, Solicitudes, motor |
| Elegibilidad, score, desempate y justificación | `packages/matching` | Recomendaciones |
| Reglas de forma de los datos | `packages/contracts` | API y web |
| Sobre de respuesta y errores HTTP | `apps/api/src/platform/http` | Todos los módulos del API |
| Cliente HTTP y manejo de errores en el navegador | `apps/web/src/shared/api` | Todas las features |

El frontend nunca recalcula scores: muestra el desglose que devuelve el backend.

## 5. Estructura del monorepo

El repositorio tiene dos aplicaciones (`apps/web`, `apps/api`), dos paquetes compartidos (`packages/contracts`, `packages/matching`) y una carpeta `database` con migraciones y seeds. Cada carpeta tiene un único dueño, declarado en `CODEOWNERS`.

```text
tutorias-matching/
├── apps/
│   ├── web/                              React + Vite
│   │   ├── src/app/                      router, providers, layout, registro de features   [Dev 5]
│   │   ├── src/shared/                   cliente HTTP, kit de UI, selector de franjas      [Dev 5]
│   │   ├── src/features/auth/                                                              [Dev 1]
│   │   ├── src/features/materias/                                                          [Dev 2]
│   │   ├── src/features/tutores/                                                           [Dev 2]
│   │   ├── src/features/estudiantes/                                                       [Dev 3]
│   │   ├── src/features/solicitudes/                                                       [Dev 3]
│   │   ├── src/features/recomendaciones/ ranking, justificación, asignaciones              [Dev 5]
│   │   ├── src/features/configuracion/   pesos del matching                                [Dev 5]
│   │   ├── src/features/dashboard/                                                         [Dev 5]
│   │   └── src/mocks/                    agregador MSW pre-cableado                        [Dev 5]
│   └── api/                              Node.js + Express
│       ├── src/app.ts, src/server.ts     composición y arranque                            [Dev 1]
│       ├── src/platform/                 config, db, http, auth, logger                    [Dev 1]
│       ├── src/modules/_plantilla/       módulo de referencia para copiar                  [Dev 1]
│       ├── src/modules/auth/                                                               [Dev 1]
│       ├── src/modules/tutores/          incluye materias                                  [Dev 2]
│       ├── src/modules/solicitudes/      incluye estudiantes                               [Dev 3]
│       ├── src/modules/recomendaciones/  recomendaciones, asignaciones, pesos              [Dev 4]
│       └── test/                         helpers: BD de test, app autenticada              [Dev 1]
├── packages/
│   ├── contracts/src/common/             sobre, errores, paginación, ids                   [Dev 1]
│   ├── contracts/src/auth/                                                                 [Dev 1]
│   ├── contracts/src/tutores/            incluye TutorParaMatching                            [Dev 2]
│   ├── contracts/src/solicitudes/        incluye SolicitudParaMatching                     [Dev 3]
│   ├── contracts/src/matching/           FranjaHoraria, entrada y salida del motor         [Dev 4]
│   ├── contracts/src/recomendaciones/                                                      [Dev 4]
│   └── matching/                         motor puro + utilidades de franjas                [Dev 4]
├── database/
│   ├── knexfile.ts                                                                         [Dev 1]
│   ├── migrations/                       AAAAMMDDHHMMSS_<modulo>_<cambio>.ts   [dueño del módulo]
│   └── seeds/                            01_admin [Dev 1] · 02_materias [Dev 2] · 03_config [Dev 4] · 10_demo [Dev 4]
├── docker/node.Dockerfile                etapas dev, build y prod                          [Dev 1]
├── docker/postgres/init/                 crea la BD de test                                [Dev 1]
├── compose.yaml, compose.prod.yaml                                                         [Dev 1]
├── tests/e2e/                            Playwright, flujos completos                      [Dev 5 + dueños]
├── docs/architecture/                    este plan + decisiones (ADR)                      [Dev 1]
├── docs/modules/<modulo>/SPEC.md         especificación que recibe cada LLM               [dueño]
├── docs/conventions.md                   convenciones para personas y LLMs                 [Dev 1]
├── .github/                              CI, CODEOWNERS, plantilla de PR                   [Dev 1]
└── package.json, package-lock.json, tsconfig.base.json, eslint.config.js, .env.example     [Dev 1]
```

### Decisiones de estructura

- **Tests junto al código** (`*.test.ts`). Solo los E2E viven en `tests/e2e`, porque cruzan módulos.
- **`database/` en la raíz.** Las migraciones son un activo transversal, pero cada archivo lleva el módulo en el nombre y `CODEOWNERS` asigna dueño por patrón (`*_tutores_*`).
- **Sin barril central en `contracts`.** Se importa por subruta (`@tutorias/contracts/tutores`) mediante `exports` en `package.json`; así nadie edita un `index.ts` compartido.
- **`docs/modules/<modulo>/SPEC.md`** es el paquete de contexto que cada desarrollador entrega a su LLM.

### Qué evoluciona solo y qué no se toca en paralelo

| Evoluciona de forma independiente | Archivos sensibles: un cambio a la vez, con revisión del dueño |
| --- | --- |
| `packages/matching` | `package.json` y `package-lock.json` de la raíz |
| Cada `apps/api/src/modules/<modulo>` | `compose.yaml`, `docker/` |
| Cada `apps/web/src/features/<feature>` | `apps/api/src/app.ts` (composición de módulos) |
| Las migraciones y fixtures de cada módulo | `apps/web/src/app/` (router) y `src/mocks/` (agregador) |
| Cada carpeta de `packages/contracts/src` excepto `common` | `packages/contracts/src/common` |
| Cada `SPEC.md` | `tsconfig.base.json`, `eslint.config.js`, `.env.example`, CI |

## 6. Módulos principales

El sistema se divide en seis módulos con un dueño cada uno; solo Recomendaciones depende de otros módulos, y lo hace en una sola dirección. La división sigue límites reales del dominio (tutor, solicitud, scoring, decisión), no un reparto por cantidad de tareas.

| Módulo | Responsabilidad | Dueño | Tablas propias | Expone a otros | Depende de |
| --- | --- | --- | --- | --- | --- |
| Plataforma | Docker, arranque del API, config, conexión a BD, errores, validación, logs, CI, helpers de test | Dev 1 | `knex_migrations` | Middlewares `validate`, `AppError`, helpers de transacción y de test | — |
| Auth | Login, sesión, roles | Dev 1 | `usuarios` | `requireAuth`, `requireRole`, `POST /auth/login`, `GET /auth/me` | Plataforma |
| Tutores y Materias | Catálogo de materias; perfil, dominio por materia, franjas, prioridad, capacidad | Dev 2 | `materias`, `tutores`, `tutor_materias`, `tutor_franjas` | `/materias`, `/tutores`; API pública `listarCandidatos(materiaId)`, `obtenerResumenes(ids)` | Plataforma, utilidades de franjas |
| Estudiantes y Solicitudes | Estudiantes; solicitudes con franjas, preferencias y estado | Dev 3 | `estudiantes`, `solicitudes`, `solicitud_franjas` | `/estudiantes`, `/solicitudes`; API pública `obtenerParaMatching(id)`, `marcarAsignada(id, trx)` | Plataforma, Materias (FK), utilidades de franjas |
| Motor de matching | Elegibilidad, score ponderado, desempate, justificación, utilidades de franjas | Dev 4 | Ninguna | `evaluar()`, `validarConfig()`, `franjas.*` | Nada (librería pura) |
| Recomendaciones y asignaciones | Orquesta el matching, guarda resultados, confirma asignaciones, versiona pesos | Dev 4 (backend), Dev 5 (frontend) | `matching_config`, `recomendaciones`, `recomendacion_candidatos`, `asignaciones` | `/recomendaciones`, `/asignaciones`, `/matching/config` | Tutores, Solicitudes, Motor |

El frontend tiene además un módulo transversal, **Shell y kit de UI** (Dev 5): router, layout, cliente HTTP, mocks, componentes comunes y el selector de franjas semanales que usan Tutores y Solicitudes.

### Reglas de dependencia

- La dirección es única: `Recomendaciones → Tutores`, `Recomendaciones → Solicitudes`, `Recomendaciones → Motor`. Tutores y Solicitudes no conocen a Recomendaciones; no hay ciclos.
- Una FK hacia la tabla de otro módulo está permitida (integridad referencial). Escribir o hacer JOIN sobre esa tabla no: se pasa por su API pública.
- ESLint lo hace cumplir: un módulo solo puede importar `modules/<otro>/index.ts`, y `packages/matching` no puede importar Express ni Knex.

### Por qué Recomendaciones se divide entre Dev 4 y Dev 5

La pantalla de recomendación es la parte más rica del frontend y el backend de recomendaciones es la extensión natural del motor. Separarlos por la frontera HTTP, con el contrato fijado en Foundation, deja a cada uno una carga equilibrada y un único punto de contacto.

## 7. Modelo de datos inicial

El modelo tiene 12 tablas repartidas entre cuatro dueños; cada recomendación guarda el snapshot de los datos y la versión de pesos usados, así cualquier resultado se puede reproducir y explicar después.

### Entidades

| Entidad | Responsabilidad | Datos principales | Relaciones | Dueño | La usan |
| --- | --- | --- | --- | --- | --- |
| Usuario | Quien opera el sistema | email, nombre, hash de contraseña, rol | Crea solicitudes, recomendaciones y asignaciones | Auth (Dev 1) | Todos (auditoría) |
| Materia | Catálogo común | código, nombre, activa | N:M con tutores; 1:N con solicitudes | Tutores (Dev 2) | Tutores, Solicitudes |
| Tutor | Perfil del par que enseña | nombre, email, prioridad 1–5, modalidad, capacidad, activo | Materias, franjas, asignaciones | Tutores (Dev 2) | Recomendaciones |
| TutorMateria | Qué domina y cuánto | nivel de dominio 1–5 | Tutor ↔ Materia | Tutores (Dev 2) | Motor (vía API pública) |
| TutorFranja | Disponibilidad semanal | día 1–7, hora inicio, hora fin | Pertenece a Tutor | Tutores (Dev 2) | Motor (vía API pública) |
| Estudiante | Quien pide ayuda | nombre, email, código, programa, semestre | 1:N solicitudes | Solicitudes (Dev 3) | Solicitudes |
| Solicitud | Pedido de tutoría | materia, tema, duración, preferencias, estado | Estudiante, Materia, franjas | Solicitudes (Dev 3) | Recomendaciones |
| SolicitudFranja | Disponibilidad del estudiante | día, hora inicio, hora fin | Pertenece a Solicitud | Solicitudes (Dev 3) | Motor (vía API pública) |
| MatchingConfig | Pesos y parámetros versionados | versión, pesos, parámetros, vigente | 1:N recomendaciones | Recomendaciones (Dev 4) | Motor |
| Recomendación | Resultado de un cálculo | resultado, tutor recomendado, score, justificación, snapshot | Solicitud, Config, candidatos | Recomendaciones (Dev 4) | Frontend, asignaciones |
| RecomendaciónCandidato | Ranking y desglose por tutor | elegible, posición, score, desglose | Recomendación ↔ Tutor | Recomendaciones (Dev 4) | Frontend |
| Asignación | Decisión confirmada | tutor, estado, motivo de cambio | Solicitud, Tutor, Recomendación | Recomendaciones (Dev 4) | Criterio de carga, dashboard |

### Esquema inicial (borrador para las migraciones)

Convenciones: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at` y `updated_at timestamptz NOT NULL DEFAULT now()` en todas las tablas (se omiten abajo). Los estados son `text` con `CHECK`, no `ENUM` de PostgreSQL, porque ampliarlos en una migración es más simple.

```sql
-- Auth (Dev 1)
CREATE TABLE usuarios (
  email          text NOT NULL,
  nombre         text NOT NULL,
  password_hash  text NOT NULL,
  rol            text NOT NULL CHECK (rol IN ('COORDINADOR')),  -- ampliable (PV-02)
  activo         boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_usuarios_email ON usuarios (lower(email));

-- Tutores y materias (Dev 2)
CREATE TABLE materias (
  codigo  text NOT NULL UNIQUE,
  nombre  text NOT NULL,
  activa  boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_materias_nombre ON materias (lower(nombre));

CREATE TABLE tutores (
  nombre            text NOT NULL,
  email             text NOT NULL,
  programa          text,
  nivel_prioridad   smallint NOT NULL CHECK (nivel_prioridad BETWEEN 1 AND 5),
  modalidad         text NOT NULL DEFAULT 'AMBAS' CHECK (modalidad IN ('PRESENCIAL','VIRTUAL','AMBAS')),
  capacidad_maxima  smallint NOT NULL DEFAULT 3 CHECK (capacidad_maxima > 0),
  activo            boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_tutores_email ON tutores (lower(email));

CREATE TABLE tutor_materias (
  tutor_id       uuid NOT NULL REFERENCES tutores(id) ON DELETE CASCADE,
  materia_id     uuid NOT NULL REFERENCES materias(id) ON DELETE RESTRICT,
  nivel_dominio  smallint NOT NULL DEFAULT 3 CHECK (nivel_dominio BETWEEN 1 AND 5),
  PRIMARY KEY (tutor_id, materia_id)
);
CREATE INDEX ix_tutor_materias_materia ON tutor_materias (materia_id);

CREATE TABLE tutor_franjas (
  tutor_id     uuid NOT NULL REFERENCES tutores(id) ON DELETE CASCADE,
  dia          smallint NOT NULL CHECK (dia BETWEEN 1 AND 7),  -- ISO: 1 = lunes
  hora_inicio  time NOT NULL,
  hora_fin     time NOT NULL,
  CHECK (hora_fin > hora_inicio),
  UNIQUE (tutor_id, dia, hora_inicio)
);

-- Estudiantes y solicitudes (Dev 3)
CREATE TABLE estudiantes (
  nombre    text NOT NULL,
  email     text NOT NULL,
  codigo    text,
  programa  text,
  semestre  smallint CHECK (semestre BETWEEN 1 AND 12)
);
CREATE UNIQUE INDEX ux_estudiantes_email ON estudiantes (lower(email));

CREATE TABLE solicitudes (
  estudiante_id        uuid NOT NULL REFERENCES estudiantes(id) ON DELETE RESTRICT,
  materia_id           uuid NOT NULL REFERENCES materias(id) ON DELETE RESTRICT,
  tema                 text,
  duracion_sesion_min  smallint NOT NULL DEFAULT 60 CHECK (duracion_sesion_min BETWEEN 30 AND 240),
  preferencias         jsonb NOT NULL DEFAULT '{}',  -- forma validada por el contrato Zod
  estado               text NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA','ASIGNADA','CANCELADA')),
  creada_por           uuid REFERENCES usuarios(id)
);
CREATE INDEX ix_solicitudes_estado_fecha ON solicitudes (estado, created_at DESC);
CREATE INDEX ix_solicitudes_estudiante ON solicitudes (estudiante_id);

CREATE TABLE solicitud_franjas (
  solicitud_id  uuid NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  dia           smallint NOT NULL CHECK (dia BETWEEN 1 AND 7),
  hora_inicio   time NOT NULL,
  hora_fin      time NOT NULL,
  CHECK (hora_fin > hora_inicio),
  UNIQUE (solicitud_id, dia, hora_inicio)
);

-- Recomendaciones y asignaciones (Dev 4)
CREATE TABLE matching_config (
  version     integer NOT NULL UNIQUE,
  pesos       jsonb NOT NULL,        -- {"dominio":0.30,"horario":0.25,...}
  parametros  jsonb NOT NULL,        -- {"topN":3,"bloquesHorarioIdeal":3}
  vigente     boolean NOT NULL DEFAULT false,
  creada_por  uuid REFERENCES usuarios(id)
);
CREATE UNIQUE INDEX ux_matching_config_vigente ON matching_config (vigente) WHERE vigente;

CREATE TABLE recomendaciones (
  solicitud_id          uuid NOT NULL REFERENCES solicitudes(id) ON DELETE RESTRICT,
  config_id             uuid NOT NULL REFERENCES matching_config(id),
  resultado             text NOT NULL CHECK (resultado IN ('RECOMENDADO','SIN_CANDIDATOS')),
  tutor_recomendado_id  uuid REFERENCES tutores(id),
  score                 numeric(5,2) CHECK (score BETWEEN 0 AND 100),
  justificacion         text NOT NULL,
  entrada_snapshot      jsonb NOT NULL,  -- datos exactos usados en el cálculo
  generada_por          uuid REFERENCES usuarios(id),
  CHECK ((resultado = 'RECOMENDADO') = (tutor_recomendado_id IS NOT NULL))
);
CREATE INDEX ix_recomendaciones_solicitud ON recomendaciones (solicitud_id, created_at DESC);

CREATE TABLE recomendacion_candidatos (
  recomendacion_id  uuid NOT NULL REFERENCES recomendaciones(id) ON DELETE CASCADE,
  tutor_id          uuid NOT NULL REFERENCES tutores(id),
  elegible          boolean NOT NULL,
  posicion          smallint,        -- NULL si no es elegible
  score             numeric(5,2),
  desglose          jsonb NOT NULL,  -- criterios con valor, peso, aporte y evidencia, o motivos de descarte
  PRIMARY KEY (recomendacion_id, tutor_id)
);

CREATE TABLE asignaciones (
  solicitud_id      uuid NOT NULL REFERENCES solicitudes(id),
  tutor_id          uuid NOT NULL REFERENCES tutores(id),
  recomendacion_id  uuid REFERENCES recomendaciones(id),
  motivo_cambio     text,  -- obligatorio si no se eligió al recomendado (regla de servicio)
  estado            text NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','FINALIZADA','CANCELADA')),
  creada_por        uuid REFERENCES usuarios(id)
);
CREATE UNIQUE INDEX ux_asignacion_activa_solicitud ON asignaciones (solicitud_id) WHERE estado = 'ACTIVA';
CREATE INDEX ix_asignaciones_tutor_activas ON asignaciones (tutor_id) WHERE estado = 'ACTIVA';
```

### Índices que importan

- `ix_tutor_materias_materia`: la consulta de candidatos parte de la materia de la solicitud.
- `ix_asignaciones_tutor_activas` (parcial): contar la carga activa por tutor en cada recomendación.
- `ix_solicitudes_estado_fecha`: bandeja de solicitudes abiertas, la vista más usada.
- Únicos sobre `lower(email)`: evitan duplicados por mayúsculas.

### Integridad

- No se borran tutores, materias ni estudiantes referenciados: se desactivan (`activo`, `activa`). Las FK con `RESTRICT` protegen el historial.
- Las franjas no pueden solaparse dentro de un mismo tutor o solicitud. Lo valida el servicio con `packages/matching/franjas`; una restricción `EXCLUDE` con `btree_gist` es una mejora opcional de Hardening.
- La suma de pesos = 1 la valida `validarConfig()` antes de insertar.

### Concurrencia

| Situación | Riesgo | Solución |
| --- | --- | --- |
| Dos confirmaciones para la misma solicitud | Doble asignación | Índice único parcial `ux_asignacion_activa_solicitud` + transacción; la segunda recibe 409 |
| Dos confirmaciones simultáneas para el mismo tutor | Superar su capacidad | `pg_advisory_xact_lock` sobre el id del tutor dentro del módulo Recomendaciones, luego contar activas; no bloquea tablas de otro módulo |
| Datos que cambian entre recomendar y confirmar | Confirmar a un tutor que ya no es elegible | La confirmación revalida solicitud abierta, tutor activo y cupo; si falla, 409 `RECOMENDACION_OBSOLETA` y se regenera |
| Reemplazo de franjas o materias de un tutor | Estado intermedio inconsistente | Borrado + inserción en una sola transacción |
| Cambio de configuración vigente | Dos versiones vigentes | Transacción + índice único parcial `ux_matching_config_vigente` |
| Dos coordinadores editan el mismo perfil | Se pierde un cambio | Última escritura gana en el MVP; bloqueo optimista con `updated_at` en Hardening si PV-02 abre más usuarios |

### Datos sensibles

- `password_hash` con bcrypt; nunca sale en respuestas ni en logs.
- Nombres, correos y datos académicos de estudiantes y tutores son datos personales: acceso solo autenticado, mínimos campos necesarios, sin volcarlos en logs. Si se usan datos reales aplica PV-11.
- `JWT_SECRET` y credenciales de la base solo por variables de entorno.

### Seeds

| Seed | Contenido | Dueño | Entornos |
| --- | --- | --- | --- |
| `01_admin` | Coordinador inicial desde `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Dev 1 | Todos |
| `02_materias` | Catálogo de materias | Dev 2 | Todos |
| `03_config` | `matching_config` versión 1, vigente | Dev 4 | Todos |
| `10_demo` | Tutores y solicitudes ficticios que cubren casos borde del matching | Dev 4 (revisan Dev 2 y 3) | Desarrollo y demo |

## 8. Arquitectura del frontend

El frontend es una SPA organizada por features: cada feature es una carpeta autocontenida que declara sus rutas, su menú, su capa de API y sus mocks, y el shell solo las registra. Así cinco personas trabajan en carpetas distintas y nadie edita un archivo central gigante.

### Estructura de una feature

```text
features/tutores/
├── index.ts                 API pública: manifiesto (rutas, menú, enabled) y lo que otras features pueden usar
├── routes.tsx
├── api/tutores.api.ts       llamadas HTTP tipadas con @tutorias/contracts/tutores
├── api/tutores.queries.ts   hooks de TanStack Query y fábrica de query keys
├── pages/                   TutoresListPage, TutorFormPage, TutorDetailPage
├── components/
├── mocks/handlers.ts        handlers MSW que sirven los fixtures del contrato
└── *.test.tsx
```

### Rutas y páginas

| Ruta | Página | Feature | Dueño |
| --- | --- | --- | --- |
| `/login` | Inicio de sesión | auth | Dev 1 |
| `/` | Dashboard: solicitudes abiertas sin asignar, asignaciones activas por tutor | dashboard | Dev 5 |
| `/materias` | Catálogo de materias | materias | Dev 2 |
| `/tutores`, `/tutores/nuevo`, `/tutores/:id` | Lista, alta y edición de tutor (materias con nivel, franjas, prioridad) | tutores | Dev 2 |
| `/estudiantes` | Lista y alta de estudiantes | estudiantes | Dev 3 |
| `/solicitudes`, `/solicitudes/nueva`, `/solicitudes/:id` | Bandeja, formulario y detalle de solicitud | solicitudes | Dev 3 |
| `/solicitudes/:id/recomendacion` | Ranking, desglose, justificación, descartados, confirmar o elegir alternativa, historial | recomendaciones | Dev 5 |
| `/asignaciones` | Asignaciones activas y finalizadas | recomendaciones | Dev 5 |
| `/configuracion/matching` | Pesos por criterio (suma = 1) y parámetros | configuracion | Dev 5 |

**Traspaso entre features por ruta.** Al crear una solicitud, Solicitudes navega a `/solicitudes/:id/recomendacion`; esa página genera la recomendación si aún no existe. El contrato entre Dev 3 y Dev 5 es solo la ruta y su parámetro.

### Estado

| Tipo de estado | Herramienta | Notas |
| --- | --- | --- |
| Datos del servidor | TanStack Query | Caché, reintentos, invalidación. Cada feature exporta su fábrica de query keys para invalidaciones cruzadas (al confirmar una asignación se invalidan solicitudes y dashboard) |
| Sesión | `AuthContext` (Dev 1) | Antes de F9 es un stub que devuelve un coordinador de desarrollo |
| Formularios | React Hook Form + `zodResolver` | Con los esquemas de `@tutorias/contracts` |
| UI local | `useState` | Sin Redux ni Zustand: no hay estado global de cliente que lo justifique |

### Servicios de API y errores

- `shared/api/http.ts` (Dev 5): base `/api/v1`, envía la cookie de sesión, desenvuelve `{ data }` y convierte `{ error }` en `ApiError(code, message, details, status)`.
- 401 dispara «sesión expirada» y redirige a `/login`; 403 muestra «sin permiso».
- Errores de validación (400) se mapean a campos del formulario con `details[].path`.
- 409 se muestra como aviso accionable («La recomendación quedó desactualizada. Regenerar»).
- `ErrorBoundary` por ruta en el shell; `EmptyState` y `ErrorState` comunes.

### Autenticación y autorización

`RequireAuth` envuelve el layout y `RequireRole` se declara por ruta en el manifiesto de cada feature. Hoy solo existe el rol coordinador; si PV-02 abre cuentas de estudiante o tutor, se agregan rutas con su rol sin tocar el shell.

### Componentes reutilizables (kit de UI, Dev 5)

`Button`, `Input`, `Select`, `FormField`, `Table`, `Pagination`, `Card`, `Badge`, `Modal`, `ConfirmDialog`, `Toast`, `EmptyState`, `ErrorState`, `Spinner` y `WeeklyScheduleInput`. Este último edita una lista de `FranjaHoraria` y lo usan Tutores y Solicitudes; sus props se fijan en F1 para que ambos puedan maquetar desde el inicio.

### Mocks

Con `VITE_API_MOCKS=true` se activa MSW. Cada feature mantiene sus handlers con los fixtures del contrato; el agregador `src/mocks/handlers.ts` ya los importa todos desde Foundation. Al integrar, se apagan por feature.

### Independencia del trabajo

- Cada feature importa de otra solo su `index.ts`.
- Los únicos archivos compartidos (router, layout, agregador de mocks, kit de UI) quedan cableados en F3 y los mantiene Dev 5.
- Una feature incompleta se mergea con `enabled: false` en su manifiesto: no aparece en el menú y no bloquea a nadie.

## 9. Arquitectura del backend

El backend es un API Express con módulos en capas (rutas → controlador → servicio → repositorio), un motor de dominio puro fuera del API y una composición manual de dependencias en `app.ts`. La lógica de negocio vive en servicios y en el motor; los controladores solo traducen HTTP.

### Estructura de un módulo

```text
modules/tutores/
├── index.ts                createTutoresModule({ db }) → { router, api }  (única puerta de entrada)
├── tutores.routes.ts       rutas + validate(esquemas de contracts) + requireRole
├── tutores.controller.ts   req → caso de uso → res
├── tutores.service.ts      casos de uso y reglas de negocio
├── tutores.repository.ts   SQL con Knex; único código que toca las tablas del módulo
├── tutores.mapper.ts       fila de BD ↔ DTO del contrato
├── tutores.public.ts       implementación de la API pública para otros módulos
├── tutores.errors.ts       códigos de error del módulo
└── __tests__/              unitarios (servicio con repositorio fake) e integración (Supertest + BD)
```

### Responsabilidad de cada capa

| Capa | Hace | No hace |
| --- | --- | --- |
| Rutas | Declara método, URL, validación de forma y rol requerido | Lógica |
| Controlador | Toma datos validados y usuario, llama al caso de uso, responde con el sobre estándar | Reglas de negocio ni SQL |
| Servicio (caso de uso) | Reglas: materia activa, franjas sin solape, transiciones de estado, orquestación, transacciones | Conocer Express |
| Repositorio | Consultas Knex y mapeo de filas | Decidir reglas |
| Motor (`packages/matching`) | Elegibilidad, score, desempate, justificación | I/O de cualquier tipo |

Para Tutores y Solicitudes, que son mayormente registro y validación, el servicio basta: no se crea una capa de dominio aparte. Recomendaciones sí separa dominio (el motor) de aplicación (el servicio) porque ahí está la lógica rica.

### Módulo Recomendaciones

```text
modules/recomendaciones/
├── index.ts                     createRecomendacionesModule({ db, tutores, solicitudes })
├── ports.ts                     TutoresPort y SolicitudesPort, definidos por este módulo
├── adapters/                    traducen la API pública de Tutores y Solicitudes a los puertos
├── fakes/                       implementaciones en memoria con fixtures, para trabajar sin los otros módulos
├── recomendaciones.service.ts   generarRecomendacion, confirmarAsignacion, cerrarAsignacion
├── config.service.ts            pesos versionados
└── *.repository.ts
```

**Caso de uso «Generar recomendación»**

1. `SolicitudesPort.obtenerParaMatching(id)`; si no está `ABIERTA` → 409.
2. `TutoresPort.listarCandidatos(materiaId)`: tutores activos que dictan la materia, con franjas, nivel de dominio, modalidad y capacidad.
3. Contar asignaciones activas por candidato (tabla propia).
4. Leer la configuración vigente.
5. `evaluar(solicitud, candidatos, config)`: cálculo puro.
6. Guardar recomendación, candidatos y snapshot en una transacción.
7. Responder el DTO `Recomendacion`.

**Caso de uso «Confirmar asignación»** (una transacción): bloqueo consultivo por tutor → revalidar solicitud abierta, tutor elegible y cupo → exigir motivo si el tutor no es el recomendado → insertar asignación → `SolicitudesPort.marcarAsignada(id, trx)`.

### Composición

```ts
// apps/api/src/app.ts (Dev 1, cableado en F2 con los cuatro módulos como stubs que responden 501)
const auth = createAuthModule({ db, config });
const tutores = createTutoresModule({ db });
const solicitudes = createSolicitudesModule({ db });
const recomendaciones = createRecomendacionesModule({ db, tutores: tutores.api, solicitudes: solicitudes.api });

app.use('/api/v1/auth', auth.router);
app.use('/api/v1', requireAuth, tutores.router, solicitudes.router, recomendaciones.router);
```

### Validación

- **Forma** (tipos, rangos, formatos): middleware `validate({ body, query, params })` con los esquemas Zod de `contracts`, antes del controlador.
- **Negocio** (existe la materia, la solicitud está abierta, hay cupo): en el servicio, con errores tipados.

### Manejo de errores

`AppError(code, status, message, details)` es la base; cada módulo define sus códigos. Un middleware final traduce todo al sobre estándar:

| Origen | HTTP | Código |
| --- | --- | --- |
| `ZodError` | 400 | `VALIDATION_ERROR` con `details[].path` |
| Sin sesión / sin rol | 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` |
| Recurso inexistente | 404 | `<MODULO>_NOT_FOUND` |
| Regla de estado (ya asignada, cancelada, obsoleta) | 409 | Código del módulo |
| PostgreSQL `23505` (único) | 409 | `CONFLICT` |
| PostgreSQL `23503` (FK) | 409 | `REFERENCE_CONFLICT` |
| Cualquier otro | 500 | `INTERNAL_ERROR`, sin stack hacia el cliente |

Toda respuesta de error lleva `requestId`, que también aparece en el log.

### Autenticación y autorización

Login con bcrypt; JWT firmado en cookie `httpOnly`, `SameSite=Lax` y `Secure` en producción. `requireAuth` protege todo salvo `/auth/login` y `/health`; `requireRole('COORDINADOR')` en cada router. En producción el API no arranca si falta `JWT_SECRET`. Nunca existe un flag que desactive la autenticación.

### Integraciones externas y eventos

- **Integraciones:** ninguna confirmada. Si PV-10 trae correo, va en `platform/integrations` detrás de una interfaz, con un fake para tests.
- **Eventos:** el MVP no tiene bus. Las llamadas síncronas por puertos cubren todo y mantienen la transacción de la confirmación. Punto de extensión: un emisor en proceso que publica después del commit, con dos eventos candidatos, `SolicitudCreada` (si se exige recomendar sin intervención del frontend) y `AsignacionConfirmada` (notificaciones).

### Observabilidad

Logs JSON con pino: `requestId`, ruta, estado, duración y, en recomendaciones, número de candidatos y tiempo del motor. No se registran cuerpos con datos personales, contraseñas ni tokens. `/health` indica que el proceso vive; `/health/ready` además consulta la base.

## 10. Contratos y API

Todos los contratos viven como esquemas Zod en `packages/contracts`, con un fixture válido por esquema; el primero en congelarse es el del motor de matching, porque bloquea el camino crítico. Con los fixtures, el frontend usa MSW, Recomendaciones usa fakes y los tests de contrato verifican que el backend responde lo prometido.

### Fronteras

| Frontera | Entrada → salida | Formato | Responsable | Consumidor | Se mockea con | Estable antes de integrar |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend → API | Request HTTP → sobre `{data}`, `{data, meta}` o `{error}` | Esquemas Zod en `contracts/<modulo>` | Dueño del módulo backend | Feature frontend | MSW + fixtures | Esquemas de request/response y códigos de error |
| API → Controlador | `req` → body, query y params ya validados | Middleware `validate` | Dev 1 (middleware), dueño (esquemas) | Controlador | — | Middleware y sobre de error (F2) |
| Controlador → Servicio | Comando tipado + `usuarioId` → DTO o `AppError` | Firma de función | Dueño del módulo | Controlador | Servicio fake en tests de rutas | Firmas de los casos de uso |
| Servicio → Repositorio | Métodos de dominio → objetos mapeados | Interfaz `XRepository` | Dueño del módulo | Servicio | Repositorio en memoria | Interfaz del repositorio |
| Repositorio → PostgreSQL | SQL de Knex → filas | Migraciones | Dueño del módulo | Repositorio | BD de test en Docker | Migraciones del módulo mergeadas |
| Servicio → Servicio (mismo módulo) | Llamada directa | Función | Dueño | Dueño | No hace falta | — |
| Módulo → Módulo | Puerto del consumidor → API pública del proveedor | Interfaz + DTOs de `contracts` | Proveedor (Dev 2, Dev 3); puerto: Dev 4 | Recomendaciones | Fakes con fixtures | `TutorParaMatching`, `SolicitudParaMatching`, `marcarAsignada` |
| Servicio → Motor | `evaluar(solicitud, candidatos, config)` → `ResultadoMatching` | Función pura | Dev 4 | Servicio de Recomendaciones | Stub que devuelve un fixture | Tipos y semántica del motor (F1) |
| Evento → Consumidor | No existe en el MVP | — | — | — | — | Nombres reservados (sección 9) |

### Formato común

```ts
// @tutorias/contracts/common (Dev 1)
type Ok<T>      = { data: T };
type Page<T>    = { data: T[]; meta: { page: number; pageSize: number; total: number } };
type ApiError   = { error: { code: string; message: string; details?: { path: string; message: string }[]; requestId: string } };
// Ids: UUID. Fechas: ISO 8601 en UTC. Paginación: ?page=1&pageSize=20 (máx. 100).

// @tutorias/contracts/matching (Dev 4)
type FranjaHoraria = { dia: 1 | 2 | 3 | 4 | 5 | 6 | 7; inicio: 'HH:mm'; fin: 'HH:mm' };  // 1 = lunes, fin > inicio
```

### Contrato del motor

```ts
// @tutorias/contracts/matching
type SolicitudMatching = {
  solicitudId: string;
  materiaId: string;
  franjas: FranjaHoraria[];
  duracionSesionMin: number;
  preferencias: { modalidad?: 'PRESENCIAL' | 'VIRTUAL'; tutorPreferidoId?: string };
};

type TutorCandidato = {          // lo arma Recomendaciones con datos de Tutores + su propia carga
  tutorId: string;
  nombre: string;
  nivelPrioridad: 1 | 2 | 3 | 4 | 5;
  nivelDominio: 1 | 2 | 3 | 4 | 5;  // en la materia de la solicitud
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'AMBAS';
  franjas: FranjaHoraria[];
  capacidadMaxima: number;
  asignacionesActivas: number;
};

type CriterioId = 'dominio' | 'horario' | 'prioridad' | 'preferencias' | 'carga';

type ConfigMatching = {
  version: number;
  pesos: Record<CriterioId, number>;  // suman 1
  parametros: { topN: number; bloquesHorarioIdeal: number };
};

type CandidatoEvaluado = {
  tutorId: string;
  posicion: number;
  score: number;  // 0–100, un decimal
  desglose: { criterio: CriterioId; valor: number; peso: number; aporte: number; evidencia: string }[];
};

type MotivoDescarte = 'SIN_HORARIO_COMPATIBLE' | 'SIN_CUPO';

type ResultadoMatching = {
  resultado: 'RECOMENDADO' | 'SIN_CANDIDATOS';
  recomendado?: CandidatoEvaluado;
  alternativas: CandidatoEvaluado[];              // siguientes topN − 1
  descartados: { tutorId: string; motivos: MotivoDescarte[] }[];
  justificacion: string;
  configVersion: number;
};

declare function evaluar(s: SolicitudMatching, c: TutorCandidato[], cfg: ConfigMatching): ResultadoMatching;
```

### Semántica del score v1 (supuestos S-04 a S-11; los pesos son configurables)

**Paso 1 — elegibilidad.** La consulta de Tutores ya filtra activos que dictan la materia. El motor descarta, con motivo, a quien no comparta con el estudiante al menos un bloque continuo de `duracionSesionMin` (`SIN_HORARIO_COMPATIBLE`) o no tenga cupo (`SIN_CUPO`).

**Paso 2 — score.** Cada criterio produce un valor entre 0 y 1; el score es la suma ponderada:

```latex
\text{score} = 100 \times \sum_{i} w_i \, v_i \qquad \sum_{i} w_i = 1
```

| Criterio | Peso v1 | Valor entre 0 y 1 | Evidencia para la justificación | Clasificación |
| --- | --- | --- | --- | --- |
| `dominio` | 0,30 | nivelDominio / 5 | «domina Cálculo I (4/5)» | Materia: confirmado; nivel: supuesto |
| `horario` | 0,25 | min(1, minutos compartidos / (bloquesHorarioIdeal × duración)) | «comparte 3 h: mar 14:00–16:00, jue 15:00–16:00» | Horario: confirmado; fórmula: supuesto |
| `prioridad` | 0,20 | nivelPrioridad / 5 | «prioridad 5/5 por experiencia» | Confirmado |
| `preferencias` | 0,15 | Preferencias cumplidas / declaradas (sin preferencias = 1) | «atiende virtual, como pediste» | Existencia: confirmada; catálogo: supuesto |
| `carga` | 0,10 | 1 − asignacionesActivas / capacidadMaxima | «tiene cupo (1 de 3)» | Supuesto |

**Paso 3 — desempate determinista:** score ↓, prioridad ↓, asignaciones activas ↑, minutos compartidos ↓, `tutorId` ↑. Mismo input, mismo output: el motor no usa reloj ni azar.

**Paso 4 — justificación** (≤ 280 caracteres, por plantilla): nombre y score, las 2 o 3 evidencias de mayor aporte y, si hay segundo, la diferencia y el criterio que más la explica. Ejemplo: «Ana Pérez (86,5/100): domina Cálculo I (5/5), comparte 3 h con tu disponibilidad y tiene prioridad 4/5. Supera a la segunda opción por 9 puntos, sobre todo en horario.» Sin candidatos: «No hay tutores elegibles: 3 sin horario compatible, 1 sin cupo».

### Endpoints (prefijo `/api/v1`)

| Método | Endpoint | Responsabilidad | Entrada | Salida | Errores principales | Dueño |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | Iniciar sesión | email, password | Usuario + cookie | 400, 401, 429 | Dev 1 |
| POST | `/auth/logout` | Cerrar sesión | — | 204 | — | Dev 1 |
| GET | `/auth/me` | Sesión actual | Cookie | Usuario | 401 | Dev 1 |
| GET | `/health`, `/health/ready` | Liveness y readiness | — | Estado | 503 | Dev 1 |
| GET | `/materias` | Catálogo | `?activa` | Materia\[\] | — | Dev 2 |
| POST / PATCH | `/materias`, `/materias/:id` | Alta y edición | código, nombre, activa | Materia | 400, 409 duplicada | Dev 2 |
| GET | `/tutores` | Lista filtrable | `?materiaId&activo&q&page` | Page de TutorResumen | 400 | Dev 2 |
| GET | `/tutores/:id` | Detalle completo | — | Tutor (materias, franjas) | 404 | Dev 2 |
| POST | `/tutores` | Alta | Datos, prioridad, modalidad, capacidad, materias, franjas | Tutor | 400, 409 email, 422 materia inactiva o franjas solapadas | Dev 2 |
| PATCH | `/tutores/:id` | Datos, prioridad, activo | Campos parciales | Tutor | 400, 404 | Dev 2 |
| PUT | `/tutores/:id/materias` | Reemplazar materias y niveles | `[{materiaId, nivelDominio}]` | Tutor | 404, 422 | Dev 2 |
| PUT | `/tutores/:id/franjas` | Reemplazar disponibilidad | `FranjaHoraria[]` | Tutor | 404, 422 solape | Dev 2 |
| GET / POST | `/estudiantes` | Buscar y registrar | `?q` / datos | Estudiante | 409 email | Dev 3 |
| GET | `/solicitudes` | Bandeja | `?estado&materiaId&page` | Page de SolicitudResumen | 400 | Dev 3 |
| GET | `/solicitudes/:id` | Detalle | — | Solicitud | 404 | Dev 3 |
| POST | `/solicitudes` | Crear | estudianteId, materiaId, tema, duración, franjas, preferencias | Solicitud (ABIERTA) | 400, 422 materia inactiva o franjas inválidas | Dev 3 |
| PATCH | `/solicitudes/:id` | Editar mientras esté abierta | Campos parciales | Solicitud | 404, 409 no abierta | Dev 3 |
| POST | `/solicitudes/:id/cancelar` | Cancelar | motivo | Solicitud | 404, 409 ya asignada | Dev 3 |
| POST | `/recomendaciones` | Generar recomendación | `{ solicitudId }` | Recomendacion (ranking, desglose, justificación) | 404, 409 no abierta | Dev 4 |
| GET | `/recomendaciones?solicitudId=` | Historial de una solicitud | solicitudId | Recomendacion\[\] | 400 | Dev 4 |
| GET | `/recomendaciones/:id` | Detalle | — | Recomendacion | 404 | Dev 4 |
| POST | `/asignaciones` | Confirmar | recomendacionId, tutorId, motivoCambio? | Asignacion | 409 ya asignada, sin cupo u obsoleta; 422 falta motivo | Dev 4 |
| GET | `/asignaciones` | Lista | `?tutorId&estado&page` | Page de Asignacion | 400 | Dev 4 |
| PATCH | `/asignaciones/:id` | Finalizar o cancelar | estado | Asignacion | 404, 409 transición inválida | Dev 4 |
| GET / PUT | `/matching/config` | Ver y versionar pesos | pesos, parámetros | ConfigMatching | 422 pesos no suman 1 | Dev 4 |

Cada módulo es dueño de su prefijo de URL; ningún router registra rutas bajo el prefijo de otro.

### Orden de estabilización

1. `common` y `FranjaHoraria`: los usan todos.
2. Contrato del motor: desbloquea F6 y F7, el camino crítico.
3. `Recomendacion` y `Asignacion`: la UI más compleja (Dev 5) depende de ellos.
4. `TutorParaMatching` (Dev 2) y `SolicitudParaMatching` (Dev 3): fronteras entre módulos backend; el adaptador de Recomendaciones las traduce a los tipos del motor.
5. CRUD de tutores, materias, estudiantes y solicitudes.
6. Auth.

### Reglas de cambio

- Versión en la URL (`/api/v1`). Un campo opcional nuevo es un cambio aditivo: PR normal con revisión del consumidor.
- Quitar o renombrar un campo, o cambiar su tipo, rompe el contrato: PR con etiqueta `contrato`, aprobación de todos los consumidores y fixtures actualizados en el mismo PR.
- Un desajuste detectado al integrar se corrige en el contrato, nunca con un parche en el consumidor.

## 11. Fases del proyecto

El proyecto tiene 13 fases agrupadas en cinco etapas; después de Foundation (F0 a F3) seis fases corren en paralelo y cada una avanza con mocks o fakes hasta su punto de integración. Las fases son unidades de ownership, no pasos de un calendario.

| Etapa | Fases |
| --- | --- |
| Foundation | F0 Bootstrap · F1 Contratos v1 · F2 Plataforma backend y Docker · F3 Shell frontend |
| Parallel Work | F4 Tutores · F5 Solicitudes · F6 Motor · F7 Recomendaciones backend · F8 Recomendaciones frontend · F9 Auth |
| Integration | F10 Integración incremental (hitos H2, H3, H4) |
| Hardening | F11 |
| Release | F12 |

### F0 — Bootstrap del monorepo

- **Objetivo:** que exista un repositorio donde los 5 commiteen sin pisarse desde el primer día. Debe tomar horas, no días.
- **Responsabilidades:** carpetas vacías con dueño; npm workspaces; `tsconfig`, ESLint y Prettier base; `CODEOWNERS`; plantilla de PR; protección de `main`; dependencias base declaradas de una vez para no pelear por el lockfile.
- **Entradas:** este plan; decisión PV-12.
- **Salidas:** repo compilable con `apps/web`, `apps/api`, `packages/contracts`, `packages/matching`, `database`, `docs`; CI mínimo (lint, typecheck, test vacío).
- **Dependencias:** ninguna.
- **Paralelización:** en paralelo con los borradores de contratos de F1 (en Markdown). Bloquea a F2, F3 y al commit de F1.
- **Responsable sugerido:** Dev 1.
- **Definition of Done:**
  - [ ] CI mínimo en verde sobre `main`.
  - [ ] `CODEOWNERS` cubre cada carpeta y patrón de migración.
  - [ ] `main` exige PR con aprobación y CI en verde.
  - [ ] Cada desarrollador mergeó un PR trivial (verifica permisos y flujo).

### F1 — Contratos v1 y modelo de datos

- **Objetivo:** fijar todas las fronteras para que cada módulo avance con mocks sin esperar a otro.
- **Responsabilidades:** Dev 1: `common` y `auth`. Dev 2: materias, tutores, `TutorParaMatching`, migraciones y seed de materias. Dev 3: estudiantes, solicitudes, `SolicitudParaMatching`, migraciones. Dev 4: `FranjaHoraria`, contrato del motor, especificación del score, fixtures dorados, contratos de recomendaciones, asignaciones y configuración, migraciones. Dev 5: revisa cada contrato de API desde las pantallas, fija las props de `WeeklyScheduleInput` y dibuja wireframes del flujo central.
- **Entradas:** F0; sección 2 con los defaults de PV.
- **Salidas:** `packages/contracts` v1 con esquemas, tipos y fixtures por endpoint; migraciones de las 12 tablas; `docs/modules/<modulo>/SPEC.md`; especificación del motor.
- **Dependencias:** F0 para commitear. Ejecutar las migraciones requiere el servicio `db` de F2.
- **Paralelización:** los 5 a la vez, cada uno en su carpeta; F2 y F3 corren al mismo tiempo. Bloquea a F4–F8 en su parte contractual.
- **Responsable sugerido:** cada dueño su contrato; Dev 1 coordina la revisión cruzada (hito **H1 · Contract freeze v1**).
- **Definition of Done:**
  - [ ] Cada esquema tiene un fixture válido y uno inválido, con test.
  - [ ] Tipos del motor revisados y aprobados por Dev 2, Dev 3 y Dev 5.
  - [ ] Migraciones aplican desde cero y revierten (`down`) en una BD limpia.
  - [ ] Un `SPEC.md` por módulo con endpoints, reglas, errores y criterios de aceptación.
  - [ ] Cada PV tiene respuesta o default anotado.

### F2 — Plataforma backend y entorno Docker

- **Objetivo:** entorno reproducible y esqueleto del API con todo lo transversal, para que los módulos solo escriban su lógica.
- **Responsabilidades:** `compose.yaml` (db, migrate, api, web), Dockerfile multietapa, `.env.example`, config validada con Zod; `app.ts` con los cuatro módulos pre-registrados como stubs 501; middlewares (requestId, logger, validate, errores, 404); `requireAuth` provisional que deja pasar; helpers de BD y transacciones; runner de migraciones y seeds; BD de test y helper `createTestApp()`; módulo `_plantilla`; health checks; CI con PostgreSQL.
- **Entradas:** F0; contrato `common`.
- **Salidas:** `docker compose up` levanta todo; plantilla de módulo; helpers de test; pipeline completo.
- **Dependencias:** F0.
- **Paralelización:** con F1, F3 y F6. Bloquea a los tests de integración de F4, F5 y F7, a F9 y a F10.
- **Responsable sugerido:** Dev 1.
- **Definition of Done:**
  - [ ] En un clon limpio, `docker compose up` deja web, api y db sanos sin instalar nada fuera de Docker (probado en los sistemas del equipo).
  - [ ] Las migraciones corren automáticamente antes de que arranque el api.
  - [ ] Un error de validación devuelve el sobre estándar con `requestId`.
  - [ ] `_plantilla` tiene un test unitario y uno de integración en verde en CI.
  - [ ] README con la sección «primeros 10 minutos».

### F3 — Shell frontend y kit de UI

- **Objetivo:** que cada feature solo tenga que llenar su carpeta.
- **Responsabilidades:** app Vite; router con los manifiestos de todas las features y páginas placeholder; layout y navegación; cliente HTTP y `ApiError`; `QueryClient`; `AuthProvider` stub; MSW con agregador pre-cableado y flag; `ErrorBoundary`; kit de UI; `WeeklyScheduleInput`.
- **Entradas:** F0; contrato `common`; props de `WeeklyScheduleInput` (F1).
- **Salidas:** shell navegable con todas las rutas; componentes con ejemplos de uso; mocks activables.
- **Dependencias:** F0.
- **Paralelización:** con F1, F2 y F6. Bloquea parcialmente la UI de F4, F5, F8 y F9 (pueden maquetar con HTML simple mientras tanto).
- **Responsable sugerido:** Dev 5.
- **Definition of Done:**
  - [ ] Todas las rutas abren su placeholder dentro del contenedor web.
  - [ ] Con mocks activos, una página de ejemplo lista datos de fixtures.
  - [ ] Tests de `ApiError` para 400, 401, 404, 409 y 500.
  - [ ] Tests de `WeeklyScheduleInput`: agregar, quitar, rechazar fin ≤ inicio.
  - [ ] `vite build` pasa en CI.

### F4 — Módulo Tutores y Materias

- **Objetivo:** cubrir RC-01, RC-02 y RC-03.
- **Responsabilidades:** API de materias y tutores; reemplazo de materias con nivel y de franjas; validación de franjas sin solape con `packages/matching/franjas`; API pública `listarCandidatos(materiaId)` y `obtenerResumenes(ids)`; páginas de materias y tutores; handlers MSW.
- **Entradas:** contratos de F1; F2 para integración; F3 para UI; utilidades de franjas de F6 (las primeras que entrega Dev 4).
- **Salidas:** `/materias` y `/tutores` reales; API pública para Recomendaciones; pantallas.
- **Dependencias:** F1; F2 y F3 para su parte de integración y UI.
- **Paralelización:** con F5–F9. Bloquea a la integración real de F7 (H3).
- **Responsable sugerido:** Dev 2.
- **Definition of Done:**
  - [ ] Tests de contrato validan cada respuesta contra su esquema.
  - [ ] Reglas probadas: prioridad 1–5, nivel 1–5, franjas válidas y sin solape, materia activa.
  - [ ] Desactivar un tutor conserva su historial.
  - [ ] `listarCandidatos` devuelve solo activos que dictan la materia, con franjas y nivel, sin consultas N+1.
  - [ ] Tests unitarios del servicio y de integración con BD.
  - [ ] Alta y edición completas desde la UI contra el API real.

### F5 — Módulo Estudiantes y Solicitudes

- **Objetivo:** cubrir RC-04.
- **Responsabilidades:** API de estudiantes y solicitudes; ciclo de estado (ABIERTA, ASIGNADA, CANCELADA); preferencias validadas por contrato; API pública `obtenerParaMatching(id)` y `marcarAsignada(id, trx)`; bandeja, formulario (con `WeeklyScheduleInput`) y detalle; navegación a la página de recomendación al crear.
- **Entradas:** contratos de F1; migración de materias (F1); F2; F3; utilidades de franjas de F6.
- **Salidas:** `/estudiantes` y `/solicitudes` reales; API pública para Recomendaciones; pantallas.
- **Dependencias:** F1; F2 y F3 para integración y UI.
- **Paralelización:** con F4 y F6–F9. Bloquea a la integración real de F7 (H3).
- **Responsable sugerido:** Dev 3.
- **Definition of Done:**
  - [ ] Solo se edita o cancela una solicitud ABIERTA; lo demás devuelve 409.
  - [ ] `marcarAsignada` funciona dentro de la transacción recibida y falla si la solicitud está cancelada.
  - [ ] Tests de contrato, unitarios e integración en verde.
  - [ ] Crear una solicitud en la UI lleva a `/solicitudes/:id/recomendacion`.

### F6 — Motor de matching

- **Objetivo:** cubrir RC-05 a RC-08 con un cálculo determinista y explicable.
- **Responsabilidades:** primero, utilidades de franjas (normalizar, solapes, minutos compartidos, bloques continuos), porque F4 y F5 las usan; luego elegibilidad con motivos, un evaluador por criterio, suma ponderada, desempate, justificación y `validarConfig()`; fixtures dorados y tests de propiedades.
- **Entradas:** contrato del motor (F1). Nada más.
- **Salidas:** `@tutorias/matching` con `evaluar()`, `validarConfig()` y `franjas.*`; documento de la fórmula.
- **Dependencias:** F1.
- **Paralelización:** con todas las demás fases. Bloquea a F7 solo en su versión real (F7 arranca con un stub).
- **Responsable sugerido:** Dev 4.
- **Definition of Done:**
  - [ ] Casos dorados: sin candidatos, empate, un solo candidato, sin preferencias, tutor sin cupo, franjas que se tocan sin solaparse, solicitud con varias franjas.
  - [ ] Propiedades: score entre 0 y 100; mismo input, mismo output; subir la prioridad nunca baja el score.
  - [ ] Todas las ramas de elegibilidad y desempate cubiertas.
  - [ ] Sin dependencias de Express ni Knex (regla de lint).
  - [ ] Justificación de 280 caracteres o menos que nombra el criterio de mayor aporte.

### F7 — Recomendaciones, asignaciones y configuración (backend)

- **Objetivo:** orquestar el matching y persistir resultados, decisiones y pesos.
- **Responsabilidades:** puertos, fakes y adaptadores; generar y consultar recomendaciones; confirmar, finalizar y cancelar asignaciones con control de concurrencia; configuración versionada; seeds `03_config` y `10_demo`.
- **Entradas:** contratos de F1; F2; motor de F6 (o stub); API pública de F4 y F5 (o fakes).
- **Salidas:** `/recomendaciones`, `/asignaciones` y `/matching/config` reales.
- **Dependencias:** F1 y F2; F6 para el motor real; F4 y F5 para H3.
- **Paralelización:** con F4, F5, F8 y F9, sobre fakes desde el inicio. Bloquea a la integración real de F8 y al E2E.
- **Responsable sugerido:** Dev 4.
- **Definition of Done:**
  - [ ] Tests de servicio con fakes: recomendar, sin candidatos, solicitud no abierta, confirmar recomendado, alternativa sin motivo (rechazo), sin cupo, recomendación obsoleta.
  - [ ] Test de concurrencia: dos confirmaciones simultáneas producen un 201 y un 409.
  - [ ] El snapshot guardado reproduce el mismo resultado al volver a evaluarlo.
  - [ ] Cambiar los pesos crea una versión nueva y deja intacta la anterior.
  - [ ] Con adaptadores reales (H3), una recomendación sale de los datos del seed de demo.

### F8 — Recomendaciones, asignaciones y dashboard (frontend)

- **Objetivo:** que el coordinador vea, entienda y confirme la recomendación.
- **Responsabilidades:** página de recomendación (generar si no existe, ranking, desglose por criterio, justificación, descartados con motivo, confirmar o elegir alternativa con motivo, regenerar, historial); asignaciones; configuración de pesos; dashboard.
- **Entradas:** contratos de API de F1; shell de F3; fixtures.
- **Salidas:** pantallas que funcionan con MSW y después con el API real.
- **Dependencias:** F1 y F3; F7 para la integración real.
- **Paralelización:** con F4–F7 y F9. Bloquea al E2E del flujo central.
- **Responsable sugerido:** Dev 5.
- **Definition of Done:**
  - [ ] Estados de carga, sin candidatos, error y conflicto 409 visibles y probados.
  - [ ] El desglose muestra cada criterio con valor, peso y aporte, tal como llega del API.
  - [ ] Ningún cálculo de score en el cliente.
  - [ ] Tests de componentes con MSW.
  - [ ] Con API real (H4), el flujo crear solicitud → confirmar funciona.

### F9 — Autenticación y autorización

- **Objetivo:** proteger el sistema para el coordinador, preparado para más roles (PV-02).
- **Responsabilidades:** login, logout y `me`; bcrypt; JWT en cookie `httpOnly`; `requireAuth` y `requireRole` reales; seed `01_admin`; rate limit en login; página de login, `AuthProvider` real y `RequireAuth`; `createTestApp()` autentica por defecto para que ningún test de otro módulo cambie.
- **Entradas:** F2, F3 y contrato `auth`.
- **Salidas:** rutas protegidas; sesión en la UI.
- **Dependencias:** F2 y F3.
- **Paralelización:** con F4–F8. No bloquea a nadie gracias al stub de F2 y F3. Bloquea a la parte de seguridad de F11.
- **Responsable sugerido:** Dev 1.
- **Definition of Done:**
  - [ ] Sin cookie: 401 en todo salvo `/auth/login` y `/health`; rol incorrecto: 403.
  - [ ] La contraseña y su hash nunca aparecen en respuestas ni logs.
  - [ ] En producción el API no arranca sin `JWT_SECRET`.
  - [ ] Login y logout probados en UI e integración.

### F10 — Integración incremental

- **Objetivo:** conectar piezas reales por fronteras, en tres hitos pequeños y no en un big bang.
- **Responsabilidades:** **H2 · Primer vertical real:** un tutor creado de punta a punta en Docker. **H3 · Matching real:** Recomendaciones con adaptadores reales, motor real y seed de demo. **H4 · Flujo completo:** la UI sin mocks; E2E Playwright del flujo central.
- **Entradas:** salidas de F4–F9.
- **Salidas:** flujo central E2E en verde en CI.
- **Dependencias:** F4, F5, F6, F7 y F8 (F9 si está lista).
- **Paralelización:** H2 puede ocurrir mientras F6–F8 siguen; H3 y H4 son secuenciales.
- **Responsable sugerido:** Dev 1 coordina; cada dueño integra su frontera.
- **Definition of Done:**
  - [ ] E2E: login → alta de tutor → solicitud → recomendación con justificación → confirmar → dashboard actualizado.
  - [ ] Ningún handler MSW activo en modo integración.
  - [ ] Ningún contrato cambió sin aprobación de su consumidor.

### F11 — Hardening

- **Objetivo:** robustez, seguridad y calidad del matching para la evaluación.
- **Responsabilidades:** casos borde y mensajes de error; helmet, CORS, límites de tamaño de payload y rate limit; logs sin datos personales; revisión de índices con `EXPLAIN` en la consulta de candidatos; restricciones `EXCLUDE` opcionales; accesibilidad básica; OpenAPI generado desde Zod (opcional).
- **Entradas:** F10 completo.
- **Salidas:** sistema endurecido y documentado.
- **Dependencias:** F10.
- **Paralelización:** cada dueño en su módulo; Dev 1 seguridad transversal; Dev 4 calidad del matching.
- **Responsable sugerido:** todos.
- **Definition of Done:**
  - [ ] Cada código de error del contrato tiene un test.
  - [ ] La consulta de candidatos y la bandeja usan índices (plan de `EXPLAIN` adjunto al PR).
  - [ ] Checklist básico de OWASP aplicado y revisado.
  - [ ] Cobertura mínima acordada por paquete y cumplida en CI.

### F12 — Release

- **Objetivo:** imagen de producción reproducible y demo lista.
- **Responsabilidades:** etapa `prod` del Dockerfile (Express sirve el build de Vite); `compose.prod.yaml` (app + db); migraciones como job previo; solo seeds base; guion de demo con casos que muestran el algoritmo; README final; tag de versión.
- **Entradas:** F11.
- **Salidas:** versión etiquetada y demo ensayada.
- **Dependencias:** F11.
- **Paralelización:** Dev 1 imagen; Dev 4 guion del algoritmo; Dev 5 pulido de UI; Dev 2 y Dev 3 documentación de sus módulos.
- **Responsable sugerido:** Dev 1.
- **Definition of Done:**
  - [ ] `docker compose -f compose.prod.yaml up` funciona en una máquina limpia.
  - [ ] Imagen sin dependencias de desarrollo y con usuario no root.
  - [ ] Smoke test posterior al arranque en verde.
  - [ ] Demo ensayada de principio a fin con el dataset.
  - [ ] Tag `v1.0.0` con notas de versión.

## 12. Matriz de trabajo para los 5 desarrolladores

Cada desarrollador tiene un área estable de principio a fin, y en ninguna etapa anterior a Integration alguien espera a otro sin un mock o fake que lo desbloquee. Dev 4 lleva el camino crítico; por eso su alcance se protege y existe un relevo acordado.

### Áreas

| Dev | Área | Es dueño de |
| --- | --- | --- |
| Dev 1 | Plataforma e integración | Docker, arranque del API, BD y migraciones (herramienta), auth, CI, helpers de test, release |
| Dev 2 | Tutores y Materias | Módulo backend, feature frontend, migraciones y seed de materias |
| Dev 3 | Estudiantes y Solicitudes | Módulo backend, feature frontend, migraciones |
| Dev 4 | Matching y Recomendaciones (backend) | Motor puro, utilidades de franjas, recomendaciones, asignaciones, pesos, dataset de demo |
| Dev 5 | Frontend core y Recomendaciones (UI) | Shell, kit de UI, selector de franjas, recomendación, asignaciones, configuración, dashboard, E2E del flujo central |

### Matriz por etapa

| Etapa | Dev 1 · Plataforma | Dev 2 · Tutores | Dev 3 · Solicitudes | Dev 4 · Matching | Dev 5 · Frontend core |
| --- | --- | --- | --- | --- | --- |
| Foundation | F0 bootstrap → F2 Docker, API base, contrato `common` | F1 contratos de materias y tutores, migraciones, seed | F1 contratos de estudiantes y solicitudes, migraciones | F1 contrato del motor, especificación, fixtures, contratos de recomendaciones | F3 shell, mocks, kit de UI; revisa contratos de API |
| Parallel · bloque A | F9 auth (API + login); helpers de test | F4 backend: servicio, repositorio, API pública | F5 backend: servicio, repositorio, API pública | F6 utilidades de franjas → motor completo | F3 `WeeklyScheduleInput`; F8 página de recomendación con MSW |
| Parallel · bloque B | Infra E2E; borrador de imagen prod; revisión de PRs de frontera | F4 frontend | F5 frontend | F7 backend sobre fakes | F8 asignaciones, configuración, dashboard |
| Integration | Lidera H2–H4 | Conecta su API pública con F7 (H3) | Conecta su API pública con F7 (H3) | Adaptadores reales, seed de demo (H3) | Apaga MSW, E2E del flujo central (H4) |
| Hardening | Seguridad transversal, rendimiento | Casos borde de tutores | Casos borde de solicitudes | Calidad del matching, concurrencia | Accesibilidad, estados de error |
| Release | Imagen y compose de producción, tag | Documentación del módulo | Documentación del módulo | Guion de demo del algoritmo | Pulido de UI, guion de demo |

### Verificación de paralelismo

| Etapa | ¿Alguien espera? | Qué lo desbloquea |
| --- | --- | --- |
| Foundation | Solo F0, durante horas | Mientras tanto, los contratos se redactan en Markdown y se commitean al terminar F0 |
| Bloque A | Dev 2 y Dev 3 necesitan las utilidades de franjas | Dev 4 las entrega primero; hasta entonces validan solo fin > inicio |
| Bloque A | Tests de integración de Dev 2, 3 y 4 necesitan F2 | Tests unitarios con repositorios en memoria hasta que F2 esté listo |
| Bloque B | Dev 4 necesita Tutores y Solicitudes | Fakes de sus puertos con los fixtures del contrato |
| Bloque B | Dev 5 necesita el API de recomendaciones | MSW con los fixtures del contrato |
| Integration | Dependencias reales e inevitables | Hitos pequeños: H2 no espera a H3, H3 no espera a la UI |

**Carga y holgura.** Dev 2 y Dev 3 tienen alcances similares y algo más livianos. Si terminan antes, Dev 2 apoya el rendimiento y el dataset de demo, y Dev 3 escribe E2E de sus flujos y revisa accesibilidad.

**Relevo acordado.** Si F6 se retrasa, Dev 1 toma la API de asignaciones y configuración de F7 (ya tiene el contrato) y Dev 4 se concentra en el motor.

**Conclusión.** La división permite que los 5 trabajen a la vez desde el final de F0. El único tramo secuencial genuino es H3 → H4, y llega cuando el trabajo paralelo ya está hecho.

## 13. Estrategia Git

La estrategia es trunk-based: `main` siempre en verde, ramas de vida corta (uno o dos días) y PRs pequeños con dueño claro. No hay rama `develop` ni ramas largas por módulo, porque producen merges masivos justo al integrar.

### Ramas

- Nombre: `<modulo>/<tipo>-<descripcion>`, por ejemplo `tutores/feat-franjas`, `matching/fix-desempate`, `plataforma/chore-ci`.
- Se crean desde `main`, se rebasan sobre `main` cada día y se borran al mergear.
- Trabajo incompleto: se mergea detrás de `enabled: false` en el manifiesto de la feature o del stub del módulo, nunca en una rama que viva semanas.

### Ownership (`CODEOWNERS`)

| Ruta o patrón | Aprueba |
| --- | --- |
| `apps/api/src/platform/`, `apps/api/src/app.ts`, `docker/`, `compose*.yaml`, `.github/`, archivos de la raíz, database/knexfile.ts, módulo y feature auth, contracts/src/auth/, database/migrations/\*\_auth\_\* | Dev 1 |
| `apps/api/src/modules/tutores/`, `apps/web/src/features/{tutores,materias}/`, `database/migrations/*_tutores_*`, `contracts/src/tutores/` | Dev 2 |
| `apps/api/src/modules/solicitudes/`, `apps/web/src/features/{solicitudes,estudiantes}/`, `database/migrations/*_solicitudes_*`, `contracts/src/solicitudes/` | Dev 3 |
| `packages/matching/`, `apps/api/src/modules/recomendaciones/`, `database/migrations/*_recomendaciones_*`, `contracts/src/{matching,recomendaciones}/` | Dev 4 |
| `apps/web/src/app/`, `apps/web/src/shared/`, `apps/web/src/mocks/`, `apps/web/src/features/{recomendaciones,configuracion,dashboard}/`, `tests/e2e/` | Dev 5 |
| `packages/contracts/src/common/` | Dev 1 + un consumidor |

### Pull requests

- **Tamaño:** como referencia, 400 líneas cambiadas o menos sin contar lockfile, fixtures y migraciones. Un propósito por PR.
- **Plantilla:** qué cambia, si toca un contrato, cómo probarlo, captura si hay UI.
- **Revisión:** aprobación del dueño de cada ruta tocada. Si toca `contracts`, también el consumidor. Si toca un archivo sensible, Dev 1 (o Dev 5 en el shell web).
- **Merge:** squash. El título del PR sigue `tipo(modulo): resumen`, por ejemplo `feat(tutores): reemplazo de franjas`. Solo se exige en el título, no en cada commit.

### Validaciones antes del merge (CI)

1. Formato (Prettier) y lint (ESLint, incluidas las reglas de fronteras entre módulos).
2. Typecheck de todo el monorepo.
3. Tests unitarios.
4. Tests de integración y de contrato contra PostgreSQL en el CI.
5. Migraciones aplicadas desde una base vacía.
6. Build del frontend.
7. Desde H4: E2E del flujo central en cada merge a `main` y bajo demanda con una etiqueta en el PR.

### Cómo se evitan los conflictos

- **Pre-cableado:** routers del API, rutas del frontend y handlers de mocks registrados en Foundation.
- **Migraciones:** un archivo nuevo por cambio, con timestamp; una migración mergeada nunca se edita. Si dos chocan en orden, se renombra el timestamp de la propia antes de mergear.
- **Lockfile:** las dependencias base se agregan en F0; cada dependencia nueva va en un PR propio y pequeño. Un conflicto en `package-lock.json` se resuelve regenerándolo con `npm install`, nunca a mano.
- **Contratos por subruta:** sin un `index.ts` compartido.
- **Formato:** nadie reformatea fuera de sus carpetas; Prettier corre igual para todos.

### Integración de fases

Cada hito (H1–H4) es un conjunto de PRs que se mergean el mismo día, con un responsable que verifica el DoD correspondiente. No existe una «rama de integración».

### Trabajo con LLMs

Cada desarrollador da a su LLM `docs/conventions.md`, su `SPEC.md`, sus contratos y la `_plantilla`, con la instrucción explícita de no tocar rutas fuera de su ownership. En la revisión se mira primero si el diff toca archivos sensibles: es el error más común de un LLM sin ese contexto.

## 14. Estrategia Docker

Se usan varios contenedores coordinados por Docker Compose, no uno solo: en desarrollo `db`, `migrate`, `api` y `web`; en producción, `app` y `db`. Todo el stack vive dentro de Docker y un clon limpio arranca con `docker compose up`.

### Por qué no un único contenedor

- **Un proceso por contenedor.** Meter Vite, Express y PostgreSQL juntos exige un supervisor de procesos y mezcla tres ciclos de vida: reiniciar el API no debería reiniciar la base.
- **Imagen oficial de PostgreSQL** con health check, volumen de datos y scripts de inicio probados, en lugar de instalarlo a mano en una imagen de Node.
- **Logs y fallos separados:** `docker compose logs api` muestra solo el API; si Vite cae, el API sigue.
- **Reconstrucciones baratas:** cambiar una dependencia del API no reconstruye la base.
- **Misma topología que producción**, donde la base suele ir aparte.
- **Sin costo extra para el desarrollador:** sigue siendo un solo comando.

### Servicios

| Servicio | Imagen | Rol | Puerto en el host | Depende de | Health check |
| --- | --- | --- | --- | --- | --- |
| `db` | `postgres:<mayor fija>-alpine` | Base de desarrollo | `${DB_HOST_PORT:-5432}` | — | `pg_isready` |
| `migrate` | Imagen dev del repo | Job: aplica migraciones y seeds (demo si `SEED_DEMO=true`) y termina | — | `db` sano | Código de salida 0 |
| `api` | Imagen dev del repo | Express con recarga automática | 3000 | `migrate` completado con éxito | `GET /health/ready` |
| `web` | Imagen dev del repo | Vite en `0.0.0.0`, proxy de `/api` hacia `api:3000` | 5173 | `api` iniciado | — |
| `db-test` (perfil `test`) | `postgres:<mayor fija>-alpine` | Base efímera en `tmpfs` para tests de integración | — | — | `pg_isready` |
| `e2e` (perfil `e2e`) | Imagen oficial de Playwright | Corre `tests/e2e` contra `web` | — | `web`, `api` | — |

### Imágenes

Un solo `docker/node.Dockerfile` multietapa: `base` (Node LTS fijado) → `deps` (`npm ci` de los workspaces) → `dev` (todas las dependencias; el código entra por bind mount) → `build` (compila el API y hace `vite build`) → `prod` (solo dependencias de producción, API compilado y frontend estático, usuario no root). La etapa `dev` sirve a `migrate`, `api` y `web`: una imagen, tres comandos.

### Persistencia

- Volumen con nombre `pgdata` para la base de desarrollo; `docker compose down -v` la reinicia desde cero.
- Bind mount del repo en `/app` para recarga en caliente.
- Volumen con nombre para `/app/node_modules`, para que los binarios del contenedor (Linux) no se mezclen con los del host.

### Red

Red por defecto de Compose; los servicios se llaman por nombre (`db`, `api`). El navegador solo habla con `web` en el puerto 5173, que reenvía `/api` al API: no hay CORS en desarrollo. El puerto 3000 queda expuesto para depurar con un cliente HTTP.

### Variables de entorno

| Variable | Servicio | Ejemplo en `.env.example` |
| --- | --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | db | `tutorias` / `tutorias` / `tutorias` |
| `DATABASE_URL`, `DATABASE_URL_TEST` | api, migrate | `postgres://tutorias:tutorias@db:5432/tutorias` |
| `NODE_ENV`, `PORT`, `LOG_LEVEL` | api | `development`, `3000`, `info` |
| `JWT_SECRET`, `COOKIE_SECURE` | api | Valor de desarrollo, `false` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | migrate | Coordinador de desarrollo |
| `SEED_DEMO` | migrate | `true` |
| `VITE_API_MOCKS`, `VITE_API_PROXY_TARGET` | web | `false`, `http://api:3000` |
| `DB_HOST_PORT`, `WATCH_POLLING` | host | `5432`, `false` |

### Secretos y configuración por entorno

- `.env.example` va en el repo con valores de desarrollo no secretos; `.env` está en `.gitignore`.
- El API valida su configuración con Zod al arrancar y se detiene si falta algo.
- Ninguna variable `VITE_*` lleva secretos: terminan dentro del bundle público.
- **Desarrollo:** `compose.yaml` + `.env`. **Test:** perfil `test` + `.env.test`. **Producción:** `compose.prod.yaml` y secretos inyectados por la plataforma de despliegue, nunca horneados en la imagen.

### Migraciones, seeds y tests

- `migrate` corre antes que `api` en cada `up`; si una migración falla, el API no arranca y el error queda en su log.
- Seeds base en todos los entornos; `10_demo` solo si `SEED_DEMO=true`.
- Tests de integración: `docker compose --profile test run --rm api npm test` contra `db-test`.

### Comandos del día a día

```text
docker compose up                                   levantar todo
docker compose exec api npm test -w apps/api        tests del API
docker compose exec web npm test -w apps/web        tests del frontend
docker compose run --rm migrate npm run migrate:make -- tutores_agrega_capacidad
docker compose down -v                              reiniciar la base
```

### Para que Docker no sea un obstáculo

- **Windows:** usar WSL2 con el repo dentro del sistema de archivos de Linux; si la recarga no detecta cambios, `WATCH_POLLING=true`.
- **PostgreSQL local ocupando el 5432:** cambiar `DB_HOST_PORT`.
- **Linux:** los contenedores corren con el UID del host para que los archivos generados (migraciones nuevas) no queden a nombre de root.
- **Editor:** el autocompletado puede usar un `npm ci` opcional en el host o un Dev Container; nunca es necesario para ejecutar el proyecto.

## 15. Camino crítico

El camino crítico es F0 → contrato del motor (F1) → F6 → F7 → H3 → H4 → F11 → F12. Hasta H3 lo lleva casi entero Dev 4; en H4 pasa a Dev 5. Cualquier día perdido ahí retrasa la entrega; en F3, F4, F5, F8 y F9 hay holgura.

&#91;embedded content: camino crítico · 8 pasos encadenados y 6 fases con holgura\]

Las fases laterales solo se vuelven críticas si la API pública de F4 y F5 no llega a H3, o si la UI de F8 no llega a H4.

- **Casi crítico:** F2. Todo lo que se integra necesita `db` y `migrate` en Compose; por eso son su primer entregable.
- **Con holgura:** F4 y F5 solo deben tener su API pública lista antes de H3; F8 avanza sobre MSW; F9 no bloquea a nadie.
- **Cómo se protege:** el contrato del motor se congela primero; F7 arranca con un stub del motor; la UI de configuración es de Dev 5 y el API de configuración tiene relevo en Dev 1.

### Dependencias inevitables y contrato mínimo que las desbloquea

| Dependencia | Por qué no se puede evitar | Contrato mínimo para trabajar en paralelo |
| --- | --- | --- |
| F7 ← F6 | Recomendaciones necesita el resultado del motor | Firma de `evaluar`, tipo `ResultadoMatching` y un fixture → stub del motor |
| F7 ← F4 y F5 | Necesita tutores y solicitudes reales | `TutorParaMatching`, `SolicitudParaMatching`, `marcarAsignada` y sus fixtures → fakes de los puertos |
| F8 ← F7 | La UI muestra recomendaciones y asignaciones | DTO `Recomendacion`, `Asignacion`, códigos de error y fixtures → MSW |
| F5 ← F4 | `solicitudes.materia_id` es FK a `materias` | Migración de `materias` y su seed, entregadas en F1 |
| F4 y F5 ← F6 | Validar franjas sin duplicar lógica | `FranjaHoraria` y firmas de `franjas.*` → validación provisional fin > inicio |
| Integración ← F2 | Base y migraciones reales | Servicios `db` y `migrate` en Compose |
| UI ← F3 | Rutas y cliente HTTP | Manifiesto de feature y `shared/api/http.ts` |
| Tests de integración ← F9 | Rutas protegidas | `createTestApp()` autenticado por defecto |

## 16. Riesgos técnicos y cuellos de botella

Los riesgos mayores no son técnicos sino de definición: qué cuenta como «mejor tutor» y cómo se mantienen alineados 5 personas y 5 LLMs. Ambos se atacan en Foundation, con la especificación del score y los contratos congelados en H1.

| Riesgo | Impacto | Probabilidad | Mitigación | Dueño |
| --- | --- | --- | --- | --- |
| Criterios y pesos del score ambiguos; el jurado valora el algoritmo | Alto | Alta | Especificación escrita, pesos configurables y versionados, fixtures dorados, desglose visible; validar PV-03 y PV-07 en el kick-off | Dev 4 |
| Deriva de contratos entre frontend y backend | Alto | Media | Zod compartido, tests de contrato, MSW con los mismos fixtures, regla de cambio con aprobación del consumidor | Dev 1 |
| Dev 4 se convierte en cuello de botella | Alto | Media | Stub del motor desde el día 1, UI de pesos en Dev 5, relevo de Dev 1 para asignaciones y configuración | Dev 1 |
| Errores con franjas: bordes que se tocan, solapes, varias franjas por día | Alto | Media | Una sola implementación en `packages/matching`, tests de propiedades, sin cruce de medianoche (S-02) | Dev 4 |
| Integración tardía en big bang | Alto | Baja | Hitos H2–H4, merges diarios a `main`, fakes reemplazados de a uno | Dev 1 |
| Conflictos en archivos centrales y en el lockfile | Medio | Alta | Pre-cableado en Foundation, dependencias declaradas en F0, lockfile regenerado y nunca editado a mano | Dev 1 |
| Cada LLM inventa sus propias convenciones | Medio | Alta | `conventions.md`, `_plantilla`, `SPEC.md` por módulo, lint estricto, revisión del dueño | Todos |
| Docker lento o recarga que no detecta cambios en Windows o macOS | Medio | Media | WSL2, `WATCH_POLLING`, volumen para `node_modules`, prueba en todos los equipos dentro de F2 | Dev 1 |
| Crecimiento de alcance (cuentas de estudiante, notificaciones) | Medio | Media | Defaults de PV; nada nuevo sin validar; puntos de extensión ya documentados | Dev 1 |
| Dataset de demo que no luce el algoritmo | Medio | Media | `10_demo` diseñado con empates, descartes y comparaciones claras | Dev 4 |
| Doble asignación o sobrecupo por concurrencia | Medio | Baja | Índice único parcial, bloqueo consultivo por tutor, test de concurrencia | Dev 4 |
| Datos personales reales sin resguardo | Medio | Baja | Datos ficticios en la demo; PV-11 antes de usar datos reales | Dev 1 |

### Cuellos de botella

- **Dev 4 entre F6 y H3.** Concentra el valor del producto. Mitigado como se describe arriba.
- **Revisión cruzada en H1.** Si un consumidor tarda en aprobar un contrato, el dueño queda frenado. Regla: revisión de contratos en menos de medio día; si no llega, decide Dev 1.
- **F2 (Compose + migraciones).** Primer entregable de Dev 1 antes que cualquier otra pieza de plataforma.
- **Dev 1 como revisor de archivos sensibles.** Dev 5 co-revisa el shell web y cada PR toca como máximo un archivo sensible.

Los archivos sensibles a conflictos están listados en la sección 5.

## 17. Orden recomendado de implementación

Se construye en cinco etapas, cada una cerrada por un hito verificable; el flujo central (solicitud → recomendación → confirmación) se prioriza sobre cualquier pantalla secundaria. Las proporciones de tiempo son una referencia hasta conocer el plazo real (PV-01).

1. **Foundation (≈ 15 % del tiempo).** F0 → F1, F2 y F3 en paralelo. Es lo mínimo para que nadie espere: repo, contratos, Docker con base y migraciones, shell con rutas y mocks. **Cierra con H1 · Contract freeze v1:** contratos aprobados por dueño y consumidor, `docker compose up` funcionando en todos los equipos.
2. **Parallel Work (≈ 45 %).** F4, F5, F6, F7, F8 y F9 a la vez, sobre mocks y fakes. **Hito intermedio H2 · Primer vertical real:** un tutor creado de punta a punta en Docker.
3. **Integration (≈ 15 %).** F10. **H3 · Matching real:** recomendaciones con datos y motor reales. **H4 · Flujo completo:** UI sin mocks y E2E en verde.
4. **Hardening (≈ 15 %).** F11: casos borde, seguridad, índices, calidad del matching, accesibilidad. **Cierra con** todos los códigos de error probados y el checklist de seguridad revisado.
5. **Release (≈ 10 %).** F12: imagen de producción, demo ensayada, `v1.0.0`.

### Orden dentro de cada área durante Parallel Work

| Dev | Primero | Después | Al final |
| --- | --- | --- | --- |
| Dev 1 | `db` + `migrate` en Compose, `createTestApp()` | Auth (API y login) | Infra E2E, borrador de imagen de producción |
| Dev 2 | API de materias, alta de tutor | Reemplazo de materias y franjas; `listarCandidatos` | Pantallas de tutores y materias |
| Dev 3 | API de estudiantes, alta de solicitud | Estados, `obtenerParaMatching`, `marcarAsignada` | Bandeja, formulario y detalle |
| Dev 4 | Utilidades de franjas | `evaluar()` y justificación; generar recomendación sobre fakes | Confirmar asignación, configuración, seed de demo |
| Dev 5 | `WeeklyScheduleInput` | Página de recomendación (ranking, desglose, confirmar) | Asignaciones, configuración, dashboard |

Si el plazo se acorta, se recorta en este orden: dashboard, pantalla de configuración (los pesos quedan en el seed), historial de recomendaciones, cuentas por rol. El flujo central y la justificación no se recortan.

## 18. Propuesta de primera fase

La primera fase es Foundation completa (F0 a F3) y termina en H1: contratos congelados, entorno Docker funcionando en los 5 equipos y cada módulo con su `SPEC.md` listo para entregar a su LLM. Empieza con un kick-off corto para cerrar decisiones, no con código.

### Kick-off (una reunión, alrededor de una hora)

1. Confirmar dueños de la sección 12.
2. Resolver o aceptar el default de los PV que cambian contratos: PV-01, PV-02, PV-03, PV-05, PV-06, PV-07 y PV-12.
3. Aprobar los pesos v1 del score y la forma de la justificación (sección 10).
4. Acordar convenciones: nombres de ramas, título de PR, códigos de error, idioma del código (se sugiere dominio en español, como en este plan).
5. Fijar la fecha de H1.

### Tareas por desarrollador

**Dev 1 · Plataforma**

- [ ] F0: estructura, workspaces, configuración base, `CODEOWNERS`, protección de `main`, CI mínimo, dependencias base.
- [ ] Contrato `common`: sobre, errores, paginación.
- [ ] F2 primero: servicios `db` y `migrate` en Compose y `knexfile`.
- [ ] F2 después: `app.ts` con stubs, middlewares, `createTestApp()`, `_plantilla`, health checks, `api` y `web` en Compose.
- [ ] `docs/conventions.md` y README «primeros 10 minutos».

**Dev 2 · Tutores y Materias**

- [ ] Contratos de materias y tutores, incluido `TutorParaMatching`, con fixtures.
- [ ] Migraciones de `materias`, `tutores`, `tutor_materias`, `tutor_franjas`; seed `02_materias` (prioridad: desbloquea a Dev 3).
- [ ] `docs/modules/tutores/SPEC.md`.

**Dev 3 · Estudiantes y Solicitudes**

- [ ] Contratos de estudiantes y solicitudes, incluido `SolicitudParaMatching` y el esquema de preferencias, con fixtures.
- [ ] Migraciones de `estudiantes`, `solicitudes`, `solicitud_franjas`.
- [ ] `docs/modules/solicitudes/SPEC.md`.

**Dev 4 · Matching**

- [ ] `FranjaHoraria` y contrato del motor: es lo primero que se congela.
- [ ] Especificación del score con ejemplos resueltos a mano (3 o 4 casos).
- [ ] Fixtures dorados del motor y contratos de recomendaciones, asignaciones y configuración.
- [ ] Migraciones de `matching_config`, `recomendaciones`, `recomendacion_candidatos`, `asignaciones`; seed `03_config`.
- [ ] `docs/modules/matching/SPEC.md` y `docs/modules/recomendaciones/SPEC.md`.

**Dev 5 · Frontend core**

- [ ] Wireframes de baja fidelidad del flujo central y de la página de recomendación.
- [ ] Revisión de cada contrato de API desde las pantallas.
- [ ] Props de `WeeklyScheduleInput`.
- [ ] F3: Vite, router con manifiestos y placeholders, layout, `http.ts`, `QueryClient`, `AuthProvider` stub, MSW con agregador, `ErrorBoundary`, kit de UI base.

### Secuencia dentro de la fase

1. Dev 1 publica el bootstrap (F0). Mientras tanto, los demás redactan sus contratos en Markdown.
2. Cada uno commitea contratos, fixtures y migraciones en su carpeta. Dev 1 entrega `db` + `migrate` para poder ejecutarlas.
3. Dev 5 levanta el shell y revisa contratos contra los wireframes.
4. Revisión cruzada de contratos (dueño + consumidor) y freeze: **H1**.

### Plantilla de `SPEC.md` (lo que recibe cada LLM)

```markdown
# SPEC — <Módulo>
## Contexto        problema, actores, requisitos que cubre (RC/S/PV)
## Alcance         qué entra; fuera de alcance explícito
## Ownership       carpetas que puede tocar; archivos prohibidos
## Contratos       expone (endpoints, API pública) · consume (con sus fixtures)
## Datos           tablas propias, migraciones, restricciones
## Reglas          reglas de negocio numeradas
## Errores         códigos y estado HTTP
## Pruebas         casos obligatorios (unitarios, integración, contrato)
## DoD             checklist de la fase
## Cómo correrlo   comandos de Docker
```

### Al terminar H1

Con los contratos congelados, el siguiente paso es generar a partir de este plan las cinco especificaciones definitivas, una por desarrollador (un `SPEC.md` por módulo que posee), y arrancar Parallel Work el mismo día.
