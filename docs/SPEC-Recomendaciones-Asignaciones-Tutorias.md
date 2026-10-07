# SPEC — Recomendaciones, Asignaciones y Configuración

> **Dueño (backend):** Dev 4  
> **Dueño (frontend):** Dev 5  
> **Módulo API:** `apps/api/src/modules/recomendaciones/`  
> **Contratos:** `packages/contracts/src/recomendaciones/`  
> **Fase principal:** F7  
> **Requisitos que cubre:** RC-05, RC-06, RC-07, RC-08 (orquestación y persistencia)

---

## Contexto

El módulo de Recomendaciones es la **capa de aplicación** que orquesta el motor de matching (librería pura en `packages/matching`) y persiste los resultados. Recibe una solicitud, obtiene los candidatos de Tutores y la solicitud de Solicitudes (a través de puertos), invoca el motor, guarda el resultado completo (recomendación, ranking con desglose, snapshot de datos) y expone endpoints para que el coordinador confirme, finalice o cancele asignaciones. También gestiona la configuración versionada de pesos.

Este módulo trabaja sobre **fakes** hasta la integración (H3), cuando se conecta con los adaptadores reales de Tutores y Solicitudes.

---

## Alcance

### Dentro de alcance

- Puertos (`TutoresPort`, `SolicitudesPort`) y sus fakes
- Adaptadores para la API pública de Tutores y Solicitudes
- Servicio de recomendaciones: generar, consultar historial
- Servicio de asignaciones: confirmar, finalizar, cancelar
- Servicio de configuración: ver y versionar pesos
- Repositorios (Knex) para las 4 tablas propias
- Control de concurrencia (advisory lock, índices parciales)
- Seeds `03_config` y `10_demo`
- Migraciones de las tablas de recomendaciones

### Fuera de alcance

- Lógica de scoring (vive en `packages/matching`, SPEC aparte)
- Frontend de recomendaciones (Dev 5)
- CRUD de tutores y solicitudes (Dev 2 y Dev 3)
- Autenticación (Dev 1)

---

## Ownership

### Carpetas que puede tocar

| Carpeta / archivo | Permiso |
| --- | --- |
| `apps/api/src/modules/recomendaciones/**` | **Dueño total** |
| `packages/contracts/src/recomendaciones/**` | **Dueño** |
| `packages/contracts/src/matching/**` | **Dueño** |
| `packages/matching/**` | **Dueño** |
| `database/migrations/*_recomendaciones_*` | **Dueño** |
| `database/seeds/03_config*` | **Dueño** |
| `database/seeds/10_demo*` | **Dueño** |

### Archivos prohibidos

Mismas restricciones que en el SPEC de matching: no tocar `app.ts`, `platform/`, `compose*.yaml`, `docker/`, `common/`, ni carpetas de otros módulos.

---

## Contratos

### Endpoints expuestos (prefijo `/api/v1`)

| Método | Endpoint | Responsabilidad | Entrada | Salida | Errores | 
| --- | --- | --- | --- | --- | --- |
| `POST` | `/recomendaciones` | Generar recomendación | `{ solicitudId }` | `Recomendacion` (ranking, desglose, justificación) | 404 solicitud no existe, 409 no está ABIERTA |
| `GET` | `/recomendaciones?solicitudId=` | Historial de una solicitud | `solicitudId` (query) | `Recomendacion[]` | 400 falta solicitudId |
| `GET` | `/recomendaciones/:id` | Detalle de una recomendación | - | `Recomendacion` | 404 |
| `POST` | `/asignaciones` | Confirmar asignación | `{ recomendacionId, tutorId, motivoCambio? }` | `Asignacion` | 409 ya asignada / sin cupo / obsoleta, 422 falta motivo |
| `GET` | `/asignaciones` | Lista de asignaciones | `?tutorId&estado&page` | `Page<Asignacion>` | 400 |
| `PATCH` | `/asignaciones/:id` | Finalizar o cancelar | `{ estado }` | `Asignacion` | 404, 409 transición inválida |
| `GET` | `/matching/config` | Ver configuración vigente | - | `ConfigMatching` | - |
| `PUT` | `/matching/config` | Crear nueva versión de pesos | `{ pesos, parametros }` | `ConfigMatching` | 422 pesos no suman 1 |

### Puertos (definidos por este módulo)

```typescript
// apps/api/src/modules/recomendaciones/ports.ts

interface TutoresPort {
  listarCandidatos(materiaId: string): Promise<TutorParaMatching[]>;
  obtenerResumenes(ids: string[]): Promise<TutorResumen[]>;
}

interface SolicitudesPort {
  obtenerParaMatching(solicitudId: string): Promise<SolicitudParaMatching>;
  marcarAsignada(solicitudId: string, trx?: Knex.Transaction): Promise<void>;
}
```

### Contratos que consume

| Contrato | Proveedor | Se mockea con |
| --- | --- | --- |
| `TutorParaMatching` | Dev 2 (`tutores.api.listarCandidatos`) | Fakes con fixtures |
| `SolicitudParaMatching` | Dev 3 (`solicitudes.api.obtenerParaMatching`) | Fakes con fixtures |
| `evaluar()`, `validarConfig()` | `packages/matching` (Dev 4, propio) | El motor real o stub |
| Middlewares `validate`, `requireAuth`, `requireRole` | Dev 1 | `createTestApp()` |

---

## Datos

### Tablas propias

#### `matching_config`

```sql
CREATE TABLE matching_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version     integer NOT NULL UNIQUE,
  pesos       jsonb NOT NULL,        -- {"dominio":0.30,"horario":0.25,...}
  parametros  jsonb NOT NULL,        -- {"topN":3,"bloquesHorarioIdeal":3}
  vigente     boolean NOT NULL DEFAULT false,
  creada_por  uuid REFERENCES usuarios(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_matching_config_vigente ON matching_config (vigente) WHERE vigente;
```

#### `recomendaciones`

```sql
CREATE TABLE recomendaciones (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id          uuid NOT NULL REFERENCES solicitudes(id) ON DELETE RESTRICT,
  config_id             uuid NOT NULL REFERENCES matching_config(id),
  resultado             text NOT NULL CHECK (resultado IN ('RECOMENDADO','SIN_CANDIDATOS')),
  tutor_recomendado_id  uuid REFERENCES tutores(id),
  score                 numeric(5,2) CHECK (score BETWEEN 0 AND 100),
  justificacion         text NOT NULL,
  entrada_snapshot      jsonb NOT NULL,
  generada_por          uuid REFERENCES usuarios(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK ((resultado = 'RECOMENDADO') = (tutor_recomendado_id IS NOT NULL))
);
CREATE INDEX ix_recomendaciones_solicitud ON recomendaciones (solicitud_id, created_at DESC);
```

#### `recomendacion_candidatos`

```sql
CREATE TABLE recomendacion_candidatos (
  recomendacion_id  uuid NOT NULL REFERENCES recomendaciones(id) ON DELETE CASCADE,
  tutor_id          uuid NOT NULL REFERENCES tutores(id),
  elegible          boolean NOT NULL,
  posicion          smallint,        -- NULL si no es elegible
  score             numeric(5,2),
  desglose          jsonb NOT NULL,
  PRIMARY KEY (recomendacion_id, tutor_id)
);
```

#### `asignaciones`

```sql
CREATE TABLE asignaciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id      uuid NOT NULL REFERENCES solicitudes(id),
  tutor_id          uuid NOT NULL REFERENCES tutores(id),
  recomendacion_id  uuid REFERENCES recomendaciones(id),
  motivo_cambio     text,
  estado            text NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','FINALIZADA','CANCELADA')),
  creada_por        uuid REFERENCES usuarios(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_asignacion_activa_solicitud ON asignaciones (solicitud_id) WHERE estado = 'ACTIVA';
CREATE INDEX ix_asignaciones_tutor_activas ON asignaciones (tutor_id) WHERE estado = 'ACTIVA';
```

### Seeds

| Seed | Contenido | Entornos |
| --- | --- | --- |
| `03_config` | `matching_config` versión 1, vigente, pesos v1 por defecto | Todos |
| `10_demo` | Tutores y solicitudes ficticios que cubren casos borde del matching: empates, descartes, comparaciones claras | Desarrollo y demo |

---

## Reglas de negocio

### RN-R01 — Generar recomendación

1. `SolicitudesPort.obtenerParaMatching(solicitudId)` → si no está `ABIERTA` → 409 `SOLICITUD_NO_ABIERTA`.
2. `TutoresPort.listarCandidatos(materiaId)` → tutores activos que dictan la materia, con franjas, nivel de dominio, modalidad y capacidad.
3. Contar asignaciones activas por candidato (tabla `asignaciones` propia).
4. Leer la configuración vigente de `matching_config`.
5. `evaluar(solicitud, candidatos, config)` → cálculo puro (motor).
6. Guardar recomendación, candidatos y snapshot en **una transacción**.
7. Responder el DTO `Recomendacion`.

### RN-R02 — Confirmar asignación (una transacción)

1. `pg_advisory_xact_lock` sobre el `tutorId` (evita sobrecupo por concurrencia).
2. Revalidar: solicitud sigue `ABIERTA`, tutor activo, tiene cupo.
3. Si el tutor elegido **no es el recomendado** → `motivoCambio` es **obligatorio**; si falta → 422 `MOTIVO_REQUERIDO`.
4. Insertar asignación con estado `ACTIVA`.
5. `SolicitudesPort.marcarAsignada(solicitudId, trx)` → cambia estado de la solicitud.
6. Si otra confirmación ya insertó → el índice único parcial `ux_asignacion_activa_solicitud` falla → 409 `SOLICITUD_YA_ASIGNADA`.

### RN-R03 — Transiciones de estado de asignación

```
ACTIVA → FINALIZADA   (la tutoría terminó)
ACTIVA → CANCELADA    (se cancela)
FINALIZADA → ✗        (estado terminal)
CANCELADA → ✗         (estado terminal)
```

Transición inválida → 409 `TRANSICION_INVALIDA`.

### RN-R04 — Configuración versionada

- Cada `PUT /matching/config` crea una **nueva versión** (auto-incremento).
- Marca la nueva como `vigente = true` y la anterior como `vigente = false`, en una transacción.
- El índice único parcial `ux_matching_config_vigente` garantiza que solo hay una vigente.
- Los pesos deben sumar 1 (validado con `validarConfig()`). Si no → 422 `PESOS_INVALIDOS`.
- Las recomendaciones guardan `config_id`: la versión de pesos usada nunca cambia retroactivamente.

### RN-R05 — Snapshot de entrada

Cada recomendación guarda en `entrada_snapshot` (JSONB) los datos exactos usados en el cálculo: solicitud, candidatos y config. Esto permite reproducir y auditar cualquier resultado.

### RN-R06 — Recomendación obsoleta

Si al confirmar se detecta que los datos cambiaron (tutor desactivado, sin cupo, etc.) → 409 `RECOMENDACION_OBSOLETA`. El frontend debe regenerar.

---

## Errores

| Código | HTTP | Situación |
| --- | --- | --- |
| `SOLICITUD_NOT_FOUND` | 404 | La solicitud no existe |
| `RECOMENDACION_NOT_FOUND` | 404 | La recomendación no existe |
| `ASIGNACION_NOT_FOUND` | 404 | La asignación no existe |
| `SOLICITUD_NO_ABIERTA` | 409 | La solicitud no está en estado ABIERTA |
| `SOLICITUD_YA_ASIGNADA` | 409 | Ya existe una asignación activa para esta solicitud |
| `SIN_CUPO_TUTOR` | 409 | El tutor alcanzó su capacidad máxima |
| `RECOMENDACION_OBSOLETA` | 409 | Los datos cambiaron desde que se generó la recomendación |
| `TRANSICION_INVALIDA` | 409 | La transición de estado no es válida |
| `MOTIVO_REQUERIDO` | 422 | Se eligió un tutor distinto al recomendado sin dar motivo |
| `PESOS_INVALIDOS` | 422 | Los pesos no suman 1 o parámetros fuera de rango |
| `CONFIG_NOT_FOUND` | 404 | No hay configuración vigente |

---

## Estructura de archivos propuesta

```
apps/api/src/modules/recomendaciones/
├── index.ts                          createRecomendacionesModule({ db, tutores, solicitudes })
├── ports.ts                          TutoresPort, SolicitudesPort
├── adapters/
│   ├── tutores.adapter.ts            traduce API pública → TutoresPort
│   └── solicitudes.adapter.ts        traduce API pública → SolicitudesPort
├── fakes/
│   ├── tutores.fake.ts               implementación en memoria con fixtures
│   └── solicitudes.fake.ts           implementación en memoria con fixtures
├── recomendaciones.routes.ts
├── recomendaciones.controller.ts
├── recomendaciones.service.ts        generarRecomendacion, obtener, listar
├── asignaciones.routes.ts
├── asignaciones.controller.ts
├── asignaciones.service.ts           confirmarAsignacion, finalizarAsignacion, cancelarAsignacion
├── config.routes.ts
├── config.controller.ts
├── config.service.ts                 obtenerVigente, crearVersion
├── recomendaciones.repository.ts
├── asignaciones.repository.ts
├── config.repository.ts
├── recomendaciones.mapper.ts         fila de BD ↔ DTO
├── recomendaciones.errors.ts         códigos de error del módulo
└── __tests__/
    ├── recomendaciones.service.test.ts
    ├── asignaciones.service.test.ts
    ├── config.service.test.ts
    ├── recomendaciones.integration.test.ts  (Supertest + BD)
    ├── asignaciones.integration.test.ts
    ├── config.integration.test.ts
    └── concurrencia.test.ts
```

---

## Pruebas

### Tests de servicio (con fakes)

| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | Generar recomendación con candidatos | `RECOMENDADO`, ranking guardado, snapshot presente |
| 2 | Sin candidatos elegibles | `SIN_CANDIDATOS`, justificación con motivos |
| 3 | Solicitud no ABIERTA | 409 `SOLICITUD_NO_ABIERTA` |
| 4 | Confirmar al recomendado | 201, asignación ACTIVA, solicitud marcada |
| 5 | Confirmar alternativa sin motivo | 422 `MOTIVO_REQUERIDO` |
| 6 | Confirmar alternativa con motivo | 201, `motivoCambio` guardado |
| 7 | Confirmar sin cupo | 409 `SIN_CUPO_TUTOR` |
| 8 | Recomendación obsoleta (tutor desactivado) | 409 `RECOMENDACION_OBSOLETA` |
| 9 | Finalizar asignación activa | Estado → `FINALIZADA` |
| 10 | Cancelar asignación ya finalizada | 409 `TRANSICION_INVALIDA` |
| 11 | Cambiar pesos (nueva versión) | Versión incrementada, anterior intacta, nueva vigente |
| 12 | Pesos que no suman 1 | 422 `PESOS_INVALIDOS` |

### Test de concurrencia

| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | Dos confirmaciones simultáneas misma solicitud | Una 201, otra 409 `SOLICITUD_YA_ASIGNADA` |
| 2 | Dos confirmaciones simultáneas mismo tutor (al límite de cupo) | Una 201, otra 409 `SIN_CUPO_TUTOR` |

### Test de snapshot

| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | Guardar y recuperar snapshot | Al re-evaluar con los datos del snapshot → mismo resultado |

### Tests de integración (Supertest + BD)

- Flujo completo: crear config → generar recomendación → confirmar → verificar estado
- Con adaptadores reales (H3): una recomendación sale de los datos del seed de demo

---

## Definition of Done (Fase F7)

- [ ] Tests de servicio con fakes: recomendar, sin candidatos, solicitud no abierta, confirmar recomendado, alternativa sin motivo (rechazo), sin cupo, recomendación obsoleta.
- [ ] Test de concurrencia: dos confirmaciones simultáneas producen un 201 y un 409.
- [ ] El snapshot guardado reproduce el mismo resultado al volver a evaluarlo.
- [ ] Cambiar los pesos crea una versión nueva y deja intacta la anterior.
- [ ] Con adaptadores reales (H3), una recomendación sale de los datos del seed de demo.

---

## Cómo correrlo

```bash
# Desde la raíz del monorepo
docker compose up -d db api       # levanta BD y API

# Tests unitarios (con fakes, sin BD)
npm run test -w apps/api -- --testPathPattern=recomendaciones

# Tests de integración (requiere BD)
npm run test:integration -w apps/api -- --testPathPattern=recomendaciones

# Solo concurrencia
npm run test:integration -w apps/api -- --testPathPattern=concurrencia
```

---

## Orden de implementación recomendado

1. **Primero:** Puertos y fakes (desbloquea todo el trabajo con mocks).
2. **Segundo:** `config.service` + migración de `matching_config` + seed `03_config`.
3. **Tercero:** `recomendaciones.service` (generar, consultar) sobre fakes.
4. **Cuarto:** `asignaciones.service` (confirmar, finalizar, cancelar) con control de concurrencia.
5. **Quinto:** Adaptadores reales + seed `10_demo` (para H3).
6. **Al final:** Tests de integración y de concurrencia.
