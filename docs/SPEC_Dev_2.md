# SPEC — Tutores y Materias

> Dueño: **Dev 2** · Fases: **F1** (contratos, migraciones, seed) y **F4** (backend + frontend) · Integra en **H2** y **H3**.
> Fuente: `docs/architecture/` (plan arquitectónico, secciones 2 a 18). Este documento **no modifica** la arquitectura: la concreta para este módulo. Si algo aquí contradice el plan, manda el plan.
> Estado de los contratos: **propuesta hasta H1 (Contract freeze v1)**. Después de H1 aplican las reglas de cambio de la sección 10 del plan.

---

## 1. Contexto

**Problema.** Hoy el coordinador cruza a mano qué tutores están disponibles, qué materias dominan y en qué horarios pueden. Este módulo es la fuente de verdad de **quién puede enseñar qué y cuándo**; el motor de matching (Dev 4) consume esos datos para recomendar.

**Qué es este módulo.** Catálogo de materias + perfil de tutor (datos básicos, prioridad, modalidad, capacidad máxima, materias con nivel de dominio y franjas semanales de disponibilidad) + una API pública que Recomendaciones usa para obtener candidatos.

**Actores.** Coordinador (único usuario con sesión en el MVP, S-12). Los tutores **no** tienen cuenta propia (PV-02, default S-12): son datos que el coordinador mantiene.

### Requisitos que cubre

| ID | Requisito |
| --- | --- |
| RC-01 | Registrar perfiles de tutores con las materias que dominan |
| RC-02 | Registrar los horarios disponibles de cada tutor |
| RC-03 | Registrar un nivel de prioridad (más experiencia = mayor peso) |
| RC-09 | Stack: React + Vite, Node.js + Express, PostgreSQL, Docker, monorepo |

### Supuestos y PV que afectan a este módulo (defaults vigentes)

| ID | Qué dice | Impacto aquí |
| --- | --- | --- |
| S-02 | Franjas semanales recurrentes (día + inicio/fin), sin cruzar medianoche, zona horaria de la institución | Modelo de `tutor_franjas` y validación |
| S-03 | Prioridad entera 1–5 fijada por el coordinador | Campo manual `nivel_prioridad` (PV-04) |
| S-04 | Nivel de dominio 1–5 por materia | `tutor_materias.nivel_dominio` |
| S-05 | Modalidad: presencial o virtual | `tutores.modalidad` (`PRESENCIAL`, `VIRTUAL`, `AMBAS`) |
| S-11 | Capacidad máxima de asignaciones activas por tutor | `tutores.capacidad_maxima` (default 3) |
| S-12 | Solo el coordinador inicia sesión | Todos los endpoints exigen rol `COORDINADOR` |
| S-14 | Sin integraciones externas | No hay correo ni calendario |
| PV-08 | ¿Un tutor puede ser también estudiante? | Tablas separadas; este módulo no impone regla (queda preparada en Recomendaciones) |
| PV-11 | Datos personales reales | Nombre y correo son datos personales: sin volcarlos en logs; datos ficticios en demo |
| PV-12 | TypeScript o JavaScript | Default: **TypeScript** |

---

## 2. Alcance

### Dentro del alcance

**Backend (`apps/api/src/modules/tutores/`)**
- CRUD de materias (alta, edición, listado con filtro `activa`).
- Alta, consulta, listado filtrable y edición de tutores.
- Reemplazo completo de materias-con-nivel y de franjas de un tutor (operaciones transaccionales).
- Desactivación lógica de tutores y materias (nunca borrado).
- API pública para otros módulos: `listarCandidatos(materiaId)` y `obtenerResumenes(ids)`.

**Frontend (`apps/web/src/features/materias/` y `apps/web/src/features/tutores/`)**
- Catálogo de materias, lista de tutores con búsqueda y filtros, formulario de alta/edición con materias+nivel, franjas (con `WeeklyScheduleInput`), prioridad, modalidad y capacidad, detalle de tutor.
- Handlers MSW con los fixtures del contrato.

**Datos**
- Migraciones de `materias`, `tutores`, `tutor_materias`, `tutor_franjas`.
- Seed `02_materias`.

**Contratos (`packages/contracts/src/tutores/`)**
- Esquemas Zod, tipos y fixtures (uno válido y uno inválido por esquema), incluido `TutorParaMatching`.

### Fuera del alcance (explícito)

- Calcular score, elegibilidad, desempate o justificación → Dev 4 (`packages/matching`).
- Contar o gestionar asignaciones activas → Recomendaciones (Dev 4). Este módulo **no** lee la tabla `asignaciones` ni sabe cuántas tiene un tutor.
- Estudiantes y solicitudes → Dev 3.
- Autenticación (login, JWT, `requireAuth`, `requireRole`) → Dev 1. Aquí solo se **usan**.
- Cuentas de login para tutores, notificaciones, integración con calendario/correo (PV-02, PV-10, S-14).
- Fechas concretas o franjas que crucen medianoche (S-02, PV-05).
- Bloqueo optimista con `updated_at`: última escritura gana en el MVP (se evalúa en Hardening si PV-02 abre más usuarios).
- Restricción `EXCLUDE` con `btree_gist` para solapes: mejora opcional de Hardening (F11).

---

## 3. Ownership

### Carpetas que puede tocar Dev 2 (y su LLM)

| Ruta | Contenido |
| --- | --- |
| `apps/api/src/modules/tutores/` | Módulo backend completo (incluye materias) |
| `apps/web/src/features/tutores/` | Feature de tutores |
| `apps/web/src/features/materias/` | Feature de materias |
| `packages/contracts/src/tutores/` | Contratos del módulo (materias, tutores, `TutorParaMatching`) |
| `database/migrations/*_tutores_*` | Migraciones propias |
| `database/seeds/02_materias.*` | Seed de materias |
| `docs/modules/tutores/` | Este SPEC |

### Archivos prohibidos (un cambio a la vez, con revisión del dueño)

`package.json` y `package-lock.json` de la raíz · `compose.yaml`, `compose.prod.yaml`, `docker/` · `apps/api/src/app.ts` · `apps/web/src/app/` (router) · `apps/web/src/mocks/handlers.ts` (agregador) · `packages/contracts/src/common/` · `tsconfig.base.json`, `eslint.config.js`, `.env.example`, `.github/`.

Tampoco se tocan carpetas de otros módulos (`solicitudes`, `recomendaciones`, `matching`, `auth`, `shared`, etc.).

- **Dependencias nuevas:** un PR propio y pequeño; las dependencias base ya están declaradas desde F0. Un conflicto en el lockfile se resuelve regenerándolo con `npm install`, nunca a mano.
- **Registro en archivos centrales:** el router del API, las rutas del frontend y el agregador de mocks ya vienen pre-cableados desde Foundation (F2/F3). Dev 2 solo llena su carpeta. Si falta algo, se pide a Dev 1 o Dev 5; no se edita el archivo central por cuenta propia.
- **Imports entre módulos:** solo `modules/<otro>/index.ts` (API) y el `index.ts` de la feature (web). ESLint lo hace cumplir.

---

## 4. Contratos

Convenciones comunes (de `@tutorias/contracts/common`, Dev 1): sobre `{ data }`, `{ data, meta }` (paginación) y `{ error }`; ids UUID; fechas ISO 8601 en UTC; paginación `?page=1&pageSize=20` (máx. 100); prefijo `/api/v1`.

Los esquemas se importan por subruta: `@tutorias/contracts/tutores`. Sin barril central.

### 4.1 Lo que este módulo **consume**

| Qué | De quién | Cómo se trabaja mientras no esté |
| --- | --- | --- |
| `FranjaHoraria` (`{ dia: 1..7, inicio: 'HH:mm', fin: 'HH:mm' }`, 1 = lunes, fin > inicio) | `@tutorias/contracts/matching` (Dev 4) | Se importa tal cual; es de lo primero que se congela |
| `packages/matching/franjas` (normalizar, detectar solapes) | Dev 4 (F6, primer entregable) | Validación provisional: solo `fin > inicio`; se reemplaza al llegar sin duplicar lógica |
| `validate`, `AppError`, helpers de transacción y de test | Plataforma (Dev 1, F2) | Se usa la plantilla `_plantilla`; hasta F2, tests unitarios con repositorio en memoria |
| `requireRole('COORDINADOR')` | Auth (Dev 1) | `requireAuth` provisional que deja pasar (F2); `createTestApp()` autenticado por defecto |
| `WeeklyScheduleInput` | Shell web (Dev 5, F3) | Maquetar con HTML simple hasta que esté |
| `shared/api/http.ts`, kit de UI, `AuthContext` stub | Shell web (Dev 5, Dev 1) | Ídem |

### 4.2 Esquemas expuestos (`packages/contracts/src/tutores/`)

Propuesta para congelar en H1. Cada esquema tiene fixture válido e inválido con test.

```ts
// Materias
type Materia = { id: string; codigo: string; nombre: string; activa: boolean };
type MateriaCrear = { codigo: string; nombre: string; activa?: boolean };      // activa default true
type MateriaActualizar = Partial<MateriaCrear>;

// Tutores
type Modalidad = 'PRESENCIAL' | 'VIRTUAL' | 'AMBAS';
type Nivel = 1 | 2 | 3 | 4 | 5;

type TutorMateria = { materiaId: string; nivelDominio: Nivel };               // nivelDominio default 3

type Tutor = {                                                                 // detalle completo
  id: string;
  nombre: string;
  email: string;
  programa?: string | null;
  nivelPrioridad: Nivel;
  modalidad: Modalidad;
  capacidadMaxima: number;                                                     // entero > 0
  activo: boolean;
  materias: (TutorMateria & { codigo: string; nombre: string })[];            // datos de la materia para mostrar
  franjas: FranjaHoraria[];
  createdAt: string; updatedAt: string;
};

type TutorResumen = {                                                          // para listados
  id: string; nombre: string; email: string;
  nivelPrioridad: Nivel; modalidad: Modalidad; capacidadMaxima: number; activo: boolean;
  materias: { materiaId: string; codigo: string; nombre: string }[];
};

type TutorCrear = {
  nombre: string; email: string; programa?: string;
  nivelPrioridad: Nivel; modalidad?: Modalidad;                                // default 'AMBAS'
  capacidadMaxima?: number;                                                    // default 3
  materias: TutorMateria[];                                                    // puede ser []
  franjas: FranjaHoraria[];                                                    // puede ser []
};

type TutorActualizar = Partial<{                                               // PATCH: sin materias ni franjas
  nombre: string; email: string; programa: string | null;
  nivelPrioridad: Nivel; modalidad: Modalidad; capacidadMaxima: number; activo: boolean;
}>;

type TutorMateriasReemplazar = TutorMateria[];                                 // PUT /tutores/:id/materias
type TutorFranjasReemplazar = FranjaHoraria[];                                 // PUT /tutores/:id/franjas
```

> Decisión: en el alta se permiten `materias` y `franjas` vacías (un tutor recién creado puede completarse después). Un tutor sin materias o sin franjas simplemente no será elegible: `listarCandidatos` solo devuelve tutores que dictan la materia, y el motor descarta a quien no comparta horario.

### 4.3 API HTTP (prefijo `/api/v1`, todo con `requireAuth` + `requireRole('COORDINADOR')`)

| Método | Endpoint | Responsabilidad | Entrada | Salida | Errores |
| --- | --- | --- | --- | --- | --- |
| GET | `/materias` | Catálogo | `?activa=true\|false` | `{ data: Materia[] }` | 400 |
| POST | `/materias` | Alta | `MateriaCrear` | `201 { data: Materia }` | 400, 409 código o nombre duplicado |
| PATCH | `/materias/:id` | Edición (incluye activar/desactivar) | `MateriaActualizar` | `{ data: Materia }` | 400, 404, 409 duplicada |
| GET | `/tutores` | Lista filtrable | `?materiaId&activo&q&page&pageSize` | `Page<TutorResumen>` | 400 |
| GET | `/tutores/:id` | Detalle completo | — | `{ data: Tutor }` | 404 |
| POST | `/tutores` | Alta | `TutorCrear` | `201 { data: Tutor }` | 400, 409 email duplicado, 422 materia inactiva/inexistente o franjas inválidas/solapadas |
| PATCH | `/tutores/:id` | Datos, prioridad, modalidad, capacidad, activo | `TutorActualizar` | `{ data: Tutor }` | 400, 404, 409 email duplicado |
| PUT | `/tutores/:id/materias` | Reemplazar materias y niveles | `TutorMateriasReemplazar` | `{ data: Tutor }` | 400, 404, 422 |
| PUT | `/tutores/:id/franjas` | Reemplazar disponibilidad | `TutorFranjasReemplazar` | `{ data: Tutor }` | 400, 404, 422 solape |

Notas:
- `q` busca por nombre o email (insensible a mayúsculas) con `ILIKE`; los comodines del usuario se escapan.
- `materiaId` en el listado filtra tutores que dictan esa materia.
- Ningún endpoint de este módulo borra registros.
- Este módulo es dueño del prefijo `/materias` y `/tutores`; ningún otro router registra rutas bajo ellos.

### 4.4 API pública (`modules/tutores/index.ts` → `createTutoresModule({ db }) → { router, api }`)

```ts
// @tutorias/contracts/tutores
type TutorParaMatching = {
  tutorId: string;
  nombre: string;
  nivelPrioridad: Nivel;
  nivelDominio: Nivel;            // en la materia consultada
  modalidad: Modalidad;
  franjas: FranjaHoraria[];
  capacidadMaxima: number;
};

type TutorResumenPublico = {
  tutorId: string; nombre: string; email: string;
  nivelPrioridad: Nivel; modalidad: Modalidad; activo: boolean;
};

interface TutoresApi {
  listarCandidatos(materiaId: string): Promise<TutorParaMatching[]>;
  obtenerResumenes(ids: string[]): Promise<TutorResumenPublico[]>;
}
```

Contrato de comportamiento:

- `listarCandidatos(materiaId)` devuelve **solo tutores activos** que dictan esa materia, con franjas y nivel de dominio de **esa** materia. Sin consultas N+1 (máximo 3 consultas, independiente del número de tutores). Orden determinista por `tutorId`. Si la materia no existe, está inactiva o nadie la dicta: `[]` (no lanza error).
- `obtenerResumenes(ids)` devuelve los tutores encontrados, **incluidos los inactivos** (el historial de recomendaciones los muestra). Los ids inexistentes se omiten. `ids` vacío devuelve `[]`.
- **No** incluye `asignacionesActivas`: lo calcula Recomendaciones con su propia tabla y arma `TutorCandidato` para el motor.
- Es la **única** puerta de entrada para otros módulos: nadie hace JOIN ni lee `tutores`, `tutor_materias` o `tutor_franjas` fuera de este módulo. El adaptador de Recomendaciones traduce `TutorParaMatching` al tipo del motor.

---

## 5. Datos

### Tablas propias

`materias`, `tutores`, `tutor_materias`, `tutor_franjas`. Convenciones: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at` y `updated_at timestamptz NOT NULL DEFAULT now()` en todas las tablas con `id` propio. Estados en `text` + `CHECK`, no `ENUM`.

```sql
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
  dia          smallint NOT NULL CHECK (dia BETWEEN 1 AND 7),   -- ISO: 1 = lunes
  hora_inicio  time NOT NULL,
  hora_fin     time NOT NULL,
  CHECK (hora_fin > hora_inicio),
  UNIQUE (tutor_id, dia, hora_inicio)
);
```

> `tutor_materias` y `tutor_franjas` tienen clave compuesta o `UNIQUE`; si el equipo de F1 las define con `id` propio, se mantiene el resto del esquema. Sigue siendo el borrador del plan (sección 7): cualquier ajuste se hace en la migración, no en este SPEC.

### Migraciones

- Una migración por archivo, con nombre `AAAAMMDDHHMMSS_tutores_<cambio>.ts` (el patrón `*_tutores_*` es el que `CODEOWNERS` asigna a Dev 2). Ejemplos: `..._tutores_crea_materias.ts`, `..._tutores_crea_tutores.ts`, `..._tutores_crea_tutor_materias.ts`, `..._tutores_crea_tutor_franjas.ts`.
- Cada una con `up` y `down`; deben aplicar desde una base vacía y revertir limpio.
- **Una migración ya mergeada nunca se edita:** se crea otra. Si dos choquen en orden, se renombra el timestamp de la propia antes de mergear.
- **Prioridad de entrega:** `materias` y su seed son lo primero (Dev 3 tiene FK `solicitudes.materia_id → materias`).
- Nuevo comando: `docker compose run --rm migrate npm run migrate:make -- tutores_<cambio>`.

### Seed `02_materias` (todos los entornos)

Catálogo inicial de materias con `codigo` único y `activa = true`. Debe ser **idempotente** (`ON CONFLICT (codigo) DO NOTHING`). Propuesta (ajustable por el equipo, datos no personales):

| codigo | nombre |
| --- | --- |
| MAT101 | Cálculo I |
| MAT102 | Cálculo II |
| MAT201 | Álgebra Lineal |
| FIS101 | Física I |
| FIS102 | Física II |
| QUI101 | Química General |
| PRG101 | Programación I |
| PRG201 | Estructuras de Datos |
| EST101 | Estadística |
| ECO101 | Microeconomía |

El seed `10_demo` (tutores ficticios) lo escribe Dev 4 y lo revisan Dev 2 y Dev 3: Dev 2 revisa que los tutores demo cubran casos borde reales de este módulo (sin materias, sin franjas, inactivo, capacidad 1, franjas que se tocan).

### Integridad

- **No se borra** lo referenciado: tutores y materias se desactivan (`activo`, `activa`). `ON DELETE RESTRICT` en `materia_id` protege el historial.
- Las franjas de un mismo tutor no pueden solaparse; lo valida el servicio con `packages/matching/franjas` (el `UNIQUE` solo evita duplicados exactos de inicio).
- Únicos sobre `lower(email)` (tutores) y `lower(nombre)` / `codigo` (materias).

### Concurrencia

| Situación | Solución |
| --- | --- |
| Reemplazo de materias o franjas de un tutor | `DELETE` + `INSERT` en **una sola transacción**; nunca estado intermedio visible |
| Dos altas con el mismo email o código a la vez | Índices únicos; el error `23505` se traduce a 409 (nunca 500) |
| Dos coordinadores editan el mismo perfil | Última escritura gana (MVP) |

---

## 6. Reglas de negocio

1. **R-01** Un tutor siempre tiene `nivelPrioridad` entero entre 1 y 5 (RC-03, S-03).
2. **R-02** `nivelDominio` es entero entre 1 y 5; si no se envía, vale 3 (S-04).
3. **R-03** `capacidadMaxima` es entero > 0; default 3 (S-11).
4. **R-04** `modalidad` ∈ {`PRESENCIAL`, `VIRTUAL`, `AMBAS`}; default `AMBAS`.
5. **R-05** El email del tutor es único sin distinguir mayúsculas; se guarda normalizado a minúsculas y sin espacios en los extremos.
6. **R-06** El código y el nombre de una materia son únicos (el nombre sin distinguir mayúsculas).
7. **R-07** Solo se pueden **asignar** a un tutor materias **activas** y existentes; las inactivas o inexistentes dan 422 `MATERIA_INACTIVA` / `MATERIA_NO_ENCONTRADA`. Un tutor que ya tiene una materia que luego se desactiva la conserva (no se purga automáticamente); `listarCandidatos` igual no será consultado para esa materia porque no se pueden crear solicitudes sobre materias inactivas (regla de Solicitudes).
8. **R-08** No se repite la misma materia dentro de un mismo reemplazo/alta (422 `MATERIA_DUPLICADA`).
9. **R-09** Cada franja cumple: `dia` entre 1 y 7, `inicio` y `fin` en formato `HH:mm`, `fin > inicio`, dentro del mismo día (sin cruzar medianoche, S-02).
10. **R-10** Las franjas de un tutor no se solapan entre sí. Dos franjas que **solo se tocan** (una termina a las 15:00 y otra empieza a las 15:00) **no** se consideran solape y son válidas. Franjas duplicadas o solapadas dan 422 `FRANJAS_SOLAPADAS`.
11. **R-11** Reemplazar materias o franjas es total (lo enviado sustituye lo anterior) y atómico. Enviar `[]` es válido y deja al tutor sin materias o sin franjas.
12. **R-12** Desactivar un tutor (`activo = false`) conserva todo su historial y lo saca de `listarCandidatos`; sigue visible en `obtenerResumenes`. Se puede reactivar.
13. **R-13** Desactivar una materia la saca del catálogo activo (`?activa=true`) pero no borra ni modifica las relaciones existentes.
14. **R-14** Este módulo no valida carga ni asignaciones: bajar `capacidadMaxima` por debajo de las asignaciones activas es permitido; Recomendaciones lo trata como `SIN_CUPO`.
15. **R-15** `PATCH /tutores/:id` no modifica materias ni franjas (para eso están los `PUT`). Un `PATCH` vacío (sin campos) es 400.
16. **R-16** Mientras `packages/matching/franjas` no esté disponible, se valida solo `fin > inicio` y se deja una única función `validarFranjas()` en el servicio, fácil de reemplazar por la utilidad compartida. **No** se copia lógica de solapes dentro de este módulo.
17. **R-17** Ningún log incluye nombre, email ni cuerpos de request de tutores (datos personales, PV-11).
18. **R-18** El frontend no calcula elegibilidad ni scores; solo captura y muestra datos.

---

## 7. Errores

Todo error responde con el sobre `{ error: { code, message, details?, requestId } }`. Los códigos del módulo viven en `tutores.errors.ts`.

| HTTP | Código | Cuándo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Esquema Zod inválido (`details[].path` indica el campo); `PATCH` vacío; `page`/`pageSize` fuera de rango |
| 401 | `UNAUTHENTICATED` | Sin sesión |
| 403 | `FORBIDDEN` | Rol distinto de `COORDINADOR` |
| 404 | `TUTORES_NOT_FOUND` | Tutor inexistente |
| 404 | `MATERIAS_NOT_FOUND` | Materia inexistente (`PATCH /materias/:id`) |
| 409 | `TUTOR_EMAIL_DUPLICADO` | Email ya registrado |
| 409 | `MATERIA_DUPLICADA_CODIGO` / `MATERIA_DUPLICADA_NOMBRE` | Código o nombre ya existe |
| 409 | `CONFLICT` | Cualquier violación `23505` no mapeada |
| 409 | `REFERENCE_CONFLICT` | Violación `23503` no mapeada |
| 422 | `MATERIA_INACTIVA` | Se intenta asignar una materia inactiva |
| 422 | `MATERIA_NO_ENCONTRADA` | `materiaId` inexistente en un alta/reemplazo |
| 422 | `MATERIA_DUPLICADA` | Misma materia repetida en la lista enviada |
| 422 | `FRANJAS_SOLAPADAS` | Franjas que se solapan o están duplicadas |
| 422 | `FRANJA_INVALIDA` | Fin ≤ inicio, hora mal formada o día fuera de 1–7 (si la forma ya la cubrió Zod, se queda en 400) |
| 500 | `INTERNAL_ERROR` | Cualquier otro; sin stack hacia el cliente |

> El plan usa 422 para materia inactiva y franjas solapadas, y 400 para validación de forma. Se mantiene esa distinción: **400 = forma, 422 = regla de negocio sobre datos bien formados**.

Frontend (`ApiError`): 400 → errores por campo (`details[].path`); 401 → redirige a `/login`; 403 → «sin permiso»; 404 → estado vacío o «no encontrado»; 409 → aviso accionable (por ejemplo, «Ya existe un tutor con ese correo»); 422 → mensaje de regla visible junto al campo correspondiente.

---

## 8. Arquitectura interna

### Backend (módulo en capas)

```text
apps/api/src/modules/tutores/
├── index.ts                createTutoresModule({ db }) → { router, api }   (única puerta de entrada)
├── tutores.routes.ts       rutas + validate(esquemas de contracts) + requireRole
├── tutores.controller.ts   req → caso de uso → res (sobre estándar)
├── tutores.service.ts      reglas R-01…R-18, transacciones
├── materias.service.ts     reglas del catálogo (opcional separar del anterior)
├── tutores.repository.ts   SQL con Knex; único código que toca las 4 tablas
├── tutores.mapper.ts       fila ↔ DTO del contrato
├── tutores.public.ts       implementación de TutoresApi
├── tutores.errors.ts       códigos de error del módulo
└── __tests__/              unitarios (servicio + repositorio en memoria) e integración (Supertest + BD)
```

| Capa | Hace | No hace |
| --- | --- | --- |
| Rutas | Método, URL, `validate`, `requireRole` | Lógica |
| Controlador | Datos validados → servicio → respuesta | Reglas ni SQL |
| Servicio | Reglas, transacciones, errores tipados (`AppError`) | Conocer Express |
| Repositorio | Consultas Knex y mapeo | Decidir reglas |

Se copia la estructura de `modules/_plantilla/` (Dev 1). El repositorio expone una interfaz `TutoresRepository` con implementación Knex e implementación en memoria para tests unitarios.

### Frontend (feature autocontenida)

```text
apps/web/src/features/tutores/
├── index.ts                manifiesto (rutas, menú, enabled) y lo que otras features pueden usar
├── routes.tsx
├── api/tutores.api.ts      llamadas HTTP tipadas con @tutorias/contracts/tutores
├── api/tutores.queries.ts  hooks TanStack Query + fábrica de query keys
├── pages/                  TutoresListPage, TutorFormPage, TutorDetailPage
├── components/             (p. ej. MateriasNivelEditor, TutorFilters)
├── mocks/handlers.ts       handlers MSW con fixtures del contrato
└── *.test.tsx

apps/web/src/features/materias/   (misma estructura; página MateriasPage)
```

| Ruta | Página | Rol |
| --- | --- | --- |
| `/materias` | Catálogo de materias (listar, crear, editar, activar/desactivar) | `COORDINADOR` |
| `/tutores` | Lista con búsqueda por texto, filtro por materia y por activo, paginación | `COORDINADOR` |
| `/tutores/nuevo` | Alta: datos, prioridad, modalidad, capacidad, materias+nivel, franjas | `COORDINADOR` |
| `/tutores/:id` | Detalle y edición (cada bloque guarda con su endpoint: datos → `PATCH`, materias → `PUT`, franjas → `PUT`) | `COORDINADOR` |

Reglas del frontend:
- Formularios con React Hook Form + `zodResolver` usando los esquemas de `@tutorias/contracts/tutores`.
- Estado de servidor con TanStack Query. La feature exporta su fábrica de query keys para invalidaciones cruzadas.
- Franjas con `WeeklyScheduleInput` (Dev 5); rechaza fin ≤ inicio en cliente, pero el servidor es quien manda.
- Estados visibles y probados: carga, vacío, error, conflicto 409, error de regla 422.
- Una feature incompleta se mergea con `enabled: false` en el manifiesto (no aparece en el menú ni bloquea a nadie).
- Sin `localStorage`/Redux/Zustand para estado de negocio.
- Mocks: activables con `VITE_API_MOCKS=true`; el agregador ya los importa. Al integrar (H2) se apagan por feature.

---

## 9. Pruebas

Tests junto al código (`*.test.ts`), salvo E2E en `tests/e2e`.

### Contrato (obligatorios)

- Cada esquema tiene fixture válido e inválido, con test.
- Cada respuesta real del API se valida contra su esquema Zod (tests de contrato con Supertest).
- Los handlers MSW sirven exactamente los fixtures del contrato.

### Unitarios del servicio (repositorio en memoria)

- Alta válida con materias y franjas; alta sin materias ni franjas.
- Prioridad fuera de 1–5; nivel de dominio fuera de 1–5; capacidad ≤ 0.
- Email duplicado (mayúsculas distintas) → 409.
- Materia inactiva, inexistente o repetida → 422.
- Franjas: fin ≤ inicio; solapadas; duplicadas; **que se tocan sin solaparse (válidas)**; varias en un mismo día; días distintos con la misma hora.
- Reemplazo con `[]` y reemplazo total (no acumula).
- Desactivar/reactivar tutor y materia.
- `PATCH` vacío → 400; `PATCH` no toca materias/franjas.

### Integración (Supertest + PostgreSQL de test)

- CRUD completo de materias y tutores; filtros `q`, `materiaId`, `activo`; paginación (`pageSize` máx. 100).
- Atomicidad: un reemplazo que falla a mitad (por ejemplo, materia inactiva en el elemento 3) deja el estado anterior intacto.
- Mapeo `23505` → 409 y `23503` → `REFERENCE_CONFLICT`.
- `401` sin cookie y `403` con rol incorrecto (cuando F9 esté lista; antes, `createTestApp()` autenticado).
- Desactivar un tutor conserva su historial; `obtenerResumenes` lo devuelve.
- Migraciones: aplican desde cero y revierten (`down`).

### API pública

- `listarCandidatos(materiaId)`: solo activos, solo los que dictan la materia, nivel de dominio de **esa** materia (un tutor con dos materias no mezcla niveles), con franjas ordenadas, orden determinista, `[]` si nadie la dicta o la materia no existe.
- **Sin N+1:** un test cuenta las consultas con 50 tutores y verifica que son constantes.
- `obtenerResumenes`: incluye inactivos, omite ids inexistentes, `[]` con lista vacía.

### Frontend (Testing Library + MSW)

- Alta y edición completas con mocks; mapeo de errores 400 a campos; avisos 409 y 422; estados de carga, vacío y error.
- La feature funciona con `enabled: true` y no aparece en el menú con `enabled: false`.

### Calidad

- Lint y typecheck sin errores; sin importar archivos internos de otros módulos; sin `console.log` con datos personales.

---

## 10. Definition of Done

### F1 — Contratos, migraciones y SPEC (cierra en H1)

- [ ] Esquemas de materias y tutores (incluido `TutorParaMatching`) con fixtures válido e inválido y test.
- [ ] Contrato de `TutorParaMatching` revisado y aprobado por Dev 4 (consumidor) y Dev 3/Dev 5 donde aplique.
- [ ] Contratos de API revisados por Dev 5 desde las pantallas.
- [ ] Migraciones de `materias`, `tutores`, `tutor_materias`, `tutor_franjas` aplican desde cero y revierten (`down`) en una BD limpia.
- [ ] Seed `02_materias` idempotente, entregado **temprano** (desbloquea a Dev 3).
- [ ] Este `SPEC.md` mergeado.
- [ ] Respuesta o default anotado para PV-02, PV-03, PV-04, PV-05, PV-09 y PV-12 en lo que toca a este módulo.

### F4 — Módulo Tutores y Materias (cubre RC-01, RC-02, RC-03)

- [ ] Tests de contrato validan cada respuesta contra su esquema.
- [ ] Reglas probadas: prioridad 1–5, nivel 1–5, franjas válidas y sin solape, materia activa.
- [ ] Desactivar un tutor conserva su historial.
- [ ] `listarCandidatos` devuelve solo activos que dictan la materia, con franjas y nivel, sin consultas N+1.
- [ ] Tests unitarios del servicio y de integración con BD en verde en CI.
- [ ] Alta y edición completas desde la UI contra el API real.
- [ ] Franjas validadas con `packages/matching/franjas` (sin lógica de solapes duplicada).
- [ ] Sin handlers MSW activos de esta feature en modo integración.
- [ ] Ningún archivo sensible modificado fuera de un PR dedicado.

### Hitos de integración

- [ ] **H2 · Primer vertical real:** un tutor creado de punta a punta (UI → API → Postgres) en Docker, sin mocks.
- [ ] **H3 · Matching real:** el adaptador de Recomendaciones consume `listarCandidatos` y `obtenerResumenes` reales; una recomendación sale de los datos del seed de demo.

---

## 11. Orden de trabajo sugerido (Dev 2)

**Foundation (F1)**
1. Contratos de materias (los más pequeños) + migración y seed `02_materias` → **desbloquea a Dev 3**.
2. Contratos de tutores y `TutorParaMatching` + migraciones restantes.
3. Fixtures y tests de contrato. Revisión cruzada con Dev 4 (motor) y Dev 5 (pantallas).
4. Este SPEC.

**Parallel Work, bloque A (F4 backend)**
1. API de materias y alta de tutor (servicio + repositorio, primero con repositorio en memoria).
2. Reemplazo de materias y franjas; `listarCandidatos` y `obtenerResumenes`.
3. Integrar `packages/matching/franjas` cuando Dev 4 la entregue.
4. Tests de integración en cuanto F2 (`db` + `migrate`) esté listo.

**Parallel Work, bloque B (F4 frontend)**
1. Páginas de materias.
2. Lista de tutores, formulario de alta/edición con `WeeklyScheduleInput` (cuando Dev 5 lo entregue).
3. Detalle y filtros. Handlers MSW siempre alineados a los fixtures.

**Integración:** conectar la API pública con Recomendaciones (H3); apagar MSW de la feature (H2).
**Hardening:** casos borde de tutores; si hay holgura, apoyar rendimiento (`EXPLAIN` de `listarCandidatos`) y dataset de demo.
**Release:** documentación del módulo.

### Dependencias externas y qué las desbloquea

| Necesito | De | Mientras tanto |
| --- | --- | --- |
| `FranjaHoraria` y `franjas.*` | Dev 4 (F6) | `FranjaHoraria` se importa del contrato; validación provisional fin > inicio (R-16) |
| `db` + `migrate` en Compose | Dev 1 (F2) | Tests unitarios con repositorio en memoria |
| `createTestApp()` autenticado | Dev 1 (F2/F9) | Tests unitarios y de repositorio |
| `WeeklyScheduleInput`, kit de UI, cliente HTTP | Dev 5 (F3) | Maquetar con HTML simple y `fetch` provisional dentro de la feature |
| Consumo real de mi API pública | Dev 4 (F7) | Dev 4 trabaja con fakes de `TutoresPort` basados en mis fixtures |

---

## 12. Cómo correrlo

```text
docker compose up                                                        levantar todo (db, migrate, api, web)
docker compose exec api npm test -w apps/api                             tests del API
docker compose exec web npm test -w apps/web                             tests del frontend
docker compose --profile test run --rm api npm test                      integración contra db-test
docker compose run --rm migrate npm run migrate:make -- tutores_<cambio> crear migración
docker compose down -v                                                   reiniciar la base
```

- Web: `http://localhost:5173` · API: `http://localhost:3000` · Con mocks: `VITE_API_MOCKS=true`.
- Seeds: `01_admin` (Dev 1) y `02_materias` corren siempre; `10_demo` solo con `SEED_DEMO=true`.
- Windows: WSL2 con el repo dentro del sistema de archivos de Linux; si la recarga falla, `WATCH_POLLING=true`. Si el 5432 está ocupado, cambiar `DB_HOST_PORT`.

---

## 13. Git y PR

- Ramas desde `main`, de vida corta: `tutores/feat-<descripcion>`, `tutores/fix-<descripcion>`, `tutores/chore-<descripcion>`. Rebase diario; se borran al mergear.
- Título de PR: `tipo(modulo): resumen`, p. ej. `feat(tutores): reemplazo de franjas`. Merge por squash.
- PR pequeños (≈ 400 líneas sin lockfile, fixtures ni migraciones), un propósito por PR.
- Aprobación de Dev 2 en todo lo que está en su ownership; si el PR toca `contracts`, también el consumidor; si toca un archivo sensible, Dev 1 (o Dev 5 en el shell web). Un PR toca como máximo **un** archivo sensible.
- Cambios de contrato:
  - Campo opcional nuevo → aditivo, PR normal con revisión del consumidor.
  - Quitar o renombrar un campo, o cambiar su tipo → PR con etiqueta `contrato`, aprobación de **todos** los consumidores y fixtures actualizados en el mismo PR.
  - Un desajuste detectado al integrar se corrige en el contrato, nunca con un parche en el consumidor.
- CI antes de mergear: Prettier, ESLint (con reglas de fronteras), typecheck, tests unitarios, integración y contrato contra PostgreSQL, migraciones desde base vacía, build del frontend.

---

## 14. Instrucciones para el LLM que implemente este módulo

Entrega al LLM: `docs/conventions.md`, este `SPEC.md`, `packages/contracts` (secciones `common`, `matching` y `tutores`), y `apps/api/src/modules/_plantilla/`.

1. Trabaja **solo** dentro de las rutas de la sección 3. Si necesitas algo fuera, detente y avisa.
2. No edites archivos sensibles (`app.ts`, router web, agregador de mocks, `common`, lockfile, Docker, CI, configuración raíz).
3. No importes archivos internos de otros módulos: solo `index.ts`. No escribas ni hagas JOIN sobre tablas ajenas (la única referencia permitida es la FK hacia `materias`, que es propia de este módulo).
4. Los esquemas Zod de `contracts` son la **única** fuente de verdad de forma: no dupliques tipos a mano.
5. Una sola implementación de franjas: usa `packages/matching/franjas`; si aún no existe, usa el `validarFranjas()` provisional de R-16 y no reinventes solapes.
6. Nunca borres registros referenciados; desactiva.
7. No registres datos personales en logs.
8. Todo cambio con pruebas del tipo que corresponda (sección 9). No marques una tarea como hecha sin cumplir su DoD.
9. Código y dominio en español, igual que el plan (`tutores`, `materias`, `franjas`); identificadores técnicos en inglés cuando son estándar (`Router`, `AppError`).
10. Ante una ambigüedad de negocio: aplica el **default** de la sección 1 y anótalo en el PR; no decidas por tu cuenta ampliar el alcance (cuentas de tutor, notificaciones, fechas concretas).

---

## 15. Preguntas abiertas que tocan este módulo

| ID | Pregunta | Default mientras tanto |
| --- | --- | --- |
| PV-02 | ¿Los tutores tendrán cuenta propia? | No; solo el coordinador (S-12) |
| PV-03 | ¿Qué preferencias existen más allá de la modalidad? | Solo modalidad (S-05); el tutor expone `modalidad` |
| PV-04 | ¿La prioridad la fija el coordinador o se deriva de la experiencia? | Campo manual 1–5 |
| PV-05 | ¿Horarios recurrentes o fechas concretas? | Franjas semanales recurrentes |
| PV-09 | ¿Existe límite de carga por tutor? | Sí: `capacidadMaxima`, default 3 |
| PV-08 | ¿Un tutor puede ser también estudiante solicitante? | Tablas separadas; sin regla en este módulo |
| — | ¿Se puede desactivar un tutor con asignaciones activas? | Permitido: este módulo no conoce asignaciones; Recomendaciones decide qué hacer con las existentes (a confirmar con Dev 4) |

Si alguna respuesta cambia el contrato, se actualiza `packages/contracts/src/tutores/` y este SPEC en el mismo PR, con la etiqueta `contrato`.
