# SPEC — Motor de Matching

> **Dueño:** Dev 4  
> **Paquete:** `packages/matching`  
> **Fase principal:** F6  
> **Requisitos que cubre:** RC-05, RC-06, RC-07, RC-08

---

## Contexto

El programa de tutorías entre pares necesita un algoritmo que, dada una solicitud de un estudiante y un conjunto de tutores candidatos, evalúe la compatibilidad de cada tutor mediante un score ponderado y recomiende al mejor con una justificación legible. Hoy el coordinador cruza esto a mano; el motor automatiza esa decisión de forma determinista, explicable y testeable.

El motor es una **librería pura** de TypeScript: sin Express, sin Knex, sin I/O de ningún tipo. Recibe datos, devuelve resultados. Se prueba con fixtures y se desarrolla desde el día 1 sin esperar a nadie.

---

## Alcance

### Dentro de alcance

- Utilidades de franjas horarias (`packages/matching/franjas`)
- Filtro de elegibilidad con motivos de descarte
- Evaluador por criterio (5 criterios v1)
- Suma ponderada → score 0–100
- Desempate determinista
- Justificación por plantilla (≤ 280 caracteres)
- Validación de configuración de pesos (`validarConfig()`)
- Fixtures dorados y tests de propiedades

### Fuera de alcance

- Persistencia (es responsabilidad del módulo Recomendaciones)
- Endpoints HTTP (los expone el módulo Recomendaciones)
- Interfaz de usuario (Dev 5)
- Datos de demo y seeds (aunque Dev 4 los diseña, se documentan en el SPEC de Recomendaciones)

---

## Ownership

### Carpetas que puede tocar

| Carpeta / archivo | Permiso |
| --- | --- |
| `packages/matching/**` | **Dueño total** — lectura y escritura |
| `packages/contracts/src/matching/**` | **Dueño** — esquemas Zod del motor |
| `database/seeds/03_config*` | **Dueño** |
| `database/seeds/10_demo*` | **Dueño** |

### Archivos prohibidos

| Carpeta / archivo | Por qué |
| --- | --- |
| `apps/api/src/app.ts` | Dueño: Dev 1 |
| `apps/api/src/platform/**` | Dueño: Dev 1 |
| `apps/web/**` | Dueños: Dev 5, Dev 1, Dev 2, Dev 3 |
| `compose*.yaml`, `docker/**` | Dueño: Dev 1 |
| `packages/contracts/src/common/**` | Dueño: Dev 1 |
| Tablas/migraciones de otros módulos | Cada dueño las suyas |

---

## Contratos

### Tipos de entrada del motor

```typescript
// packages/contracts/src/matching/

type FranjaHoraria = {
  dia: number;          // 1–7 (ISO: 1 = lunes)
  horaInicio: string;   // "HH:mm"
  horaFin: string;      // "HH:mm", > horaInicio, no cruza medianoche
};

type TutorCandidato = {
  tutorId: string;
  nivelDominio: number;       // 1–5
  nivelPrioridad: number;     // 1–5
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'AMBAS';
  capacidadMaxima: number;    // > 0
  asignacionesActivas: number;
  franjas: FranjaHoraria[];
};

type SolicitudMatching = {
  solicitudId: string;
  materiaId: string;
  duracionSesionMin: number;  // 30–240, default 60
  preferencias: {
    modalidad?: 'PRESENCIAL' | 'VIRTUAL';
    tutorPreferido?: string;
  };
  franjas: FranjaHoraria[];
};

type ConfigMatching = {
  version: number;
  pesos: {
    dominio: number;      // default 0.30
    horario: number;      // default 0.25
    prioridad: number;    // default 0.20
    preferencias: number; // default 0.15
    carga: number;        // default 0.10
  };
  parametros: {
    topN: number;                  // default 3
    bloquesHorarioIdeal: number;   // default 3
  };
};
```

### Tipos de salida del motor

```typescript
type MotivoDescarte = 'SIN_HORARIO_COMPATIBLE' | 'SIN_CUPO';

type CriterioEvaluado = {
  criterio: string;       // 'dominio' | 'horario' | 'prioridad' | 'preferencias' | 'carga'
  valor: number;          // 0–1 normalizado
  peso: number;           // del config
  aporte: number;         // valor × peso × 100
  evidencia: string;      // texto legible, e.g. "domina Cálculo I (4/5)"
};

type CandidatoEvaluado = {
  tutorId: string;
  elegible: true;
  posicion: number;       // 1-based
  score: number;          // 0–100
  desglose: CriterioEvaluado[];
};

type CandidatoDescartado = {
  tutorId: string;
  elegible: false;
  motivos: MotivoDescarte[];
};

type ResultadoMatching = {
  resultado: 'RECOMENDADO' | 'SIN_CANDIDATOS';
  recomendado?: CandidatoEvaluado;
  alternativas: CandidatoEvaluado[];   // siguientes topN - 1
  descartados: CandidatoDescartado[];
  justificacion: string;               // ≤ 280 caracteres
  configVersion: number;
};

// API pública del motor
declare function evaluar(
  solicitud: SolicitudMatching,
  candidatos: TutorCandidato[],
  config: ConfigMatching
): ResultadoMatching;

declare function validarConfig(config: ConfigMatching): boolean;
// true si los pesos suman 1 (con tolerancia ε = 0.001) y topN ≥ 1
```

### Contratos que consume

| Contrato | Proveedor | Fixture |
| --- | --- | --- |
| `TutorParaMatching` → se mapea a `TutorCandidato` | Dev 2 (vía adaptador de Recomendaciones) | En `contracts/src/tutores/fixtures` |
| `SolicitudParaMatching` → se mapea a `SolicitudMatching` | Dev 3 (vía adaptador de Recomendaciones) | En `contracts/src/solicitudes/fixtures` |

---

## Datos

El motor **no tiene tablas propias**. Es una librería pura sin I/O.

---

## Reglas de negocio

### RN-M01 — Elegibilidad (Paso 1)

La consulta de Tutores ya filtra activos que dictan la materia. El motor aplica filtros duros adicionales:

1. **`SIN_HORARIO_COMPATIBLE`**: el tutor no comparte con el estudiante al menos un bloque continuo de `duracionSesionMin` minutos.
2. **`SIN_CUPO`**: `asignacionesActivas >= capacidadMaxima`.

Un candidato descartado puede tener varios motivos. Todos los descartados se devuelven con sus motivos para informar al coordinador.

### RN-M02 — Score ponderado (Paso 2)

Cada criterio produce un valor normalizado entre 0 y 1. El score total es:

$$\text{score} = 100 \times \sum_{i} w_i \, v_i \qquad \text{donde} \sum_{i} w_i = 1$$

| Criterio | Clave | Peso v1 | Fórmula del valor (0–1) | Evidencia para justificación |
| --- | --- | --- | --- | --- |
| Dominio de la materia | `dominio` | 0.30 | `nivelDominio / 5` | "domina Cálculo I (4/5)" |
| Compatibilidad horaria | `horario` | 0.25 | `min(1, minutosCompartidos / (bloquesHorarioIdeal × duracionSesionMin))` | "comparte 3 h: mar 14–16, jue 15–16" |
| Prioridad / experiencia | `prioridad` | 0.20 | `nivelPrioridad / 5` | "prioridad 5/5 por experiencia" |
| Preferencias cumplidas | `preferencias` | 0.15 | `preferencias cumplidas / declaradas` (sin preferencias → 1.0) | "atiende virtual, como pediste" |
| Balance de carga | `carga` | 0.10 | `1 - asignacionesActivas / capacidadMaxima` | "tiene cupo (1 de 3)" |

### RN-M03 — Desempate determinista (Paso 3)

Si dos candidatos tienen el mismo score, se desempatan en este orden:

1. Score ↓ (mayor primero)
2. Prioridad ↓
3. Asignaciones activas ↑ (menor carga primero)
4. Minutos compartidos ↓
5. `tutorId` ↑ (orden lexicográfico, último recurso)

**El motor no usa reloj ni azar.** Mismo input → mismo output, siempre.

### RN-M04 — Justificación por plantilla (Paso 4)

- **≤ 280 caracteres**, generada con plantillas deterministas, sin IA externa.
- Incluye: nombre del criterio de mayor aporte, score, y las 2–3 evidencias más relevantes.
- Si hay segundo candidato: la diferencia de puntos y el criterio que más la explica.
- **Ejemplo con recomendado:** "Ana Pérez (86,5/100): domina Cálculo I (5/5), comparte 3 h con tu disponibilidad y tiene prioridad 4/5. Supera a la segunda opción por 9 puntos, sobre todo en horario."
- **Ejemplo sin candidatos:** "No hay tutores elegibles: 3 sin horario compatible, 1 sin cupo."

### RN-M05 — Resultado

- `RECOMENDADO`: hay al menos un candidato elegible. Se devuelve el top-1 como `recomendado` y los siguientes `topN - 1` como `alternativas`.
- `SIN_CANDIDATOS`: ningún candidato pasó los filtros de elegibilidad.

### RN-M06 — Validación de configuración

`validarConfig(config)`:
- Todos los pesos deben ser ≥ 0.
- La suma de pesos debe ser 1 (con tolerancia ε = 0.001).
- `topN` ≥ 1.
- `bloquesHorarioIdeal` ≥ 1.

---

## Utilidades de Franjas (`packages/matching/franjas`)

Las usa el motor, pero también los módulos de Tutores (Dev 2) y Solicitudes (Dev 3) para validar que las franjas no se solapen.

### Funciones a exponer

| Función | Descripción |
| --- | --- |
| `validarFranja(f: FranjaHoraria): boolean` | `dia` 1–7, `horaFin > horaInicio`, no cruza medianoche |
| `haySolape(a: FranjaHoraria, b: FranjaHoraria): boolean` | `true` si están en el mismo día y se solapan temporalmente |
| `detectarSolapes(franjas: FranjaHoraria[]): [number, number][]` | Pares de índices que se solapan (para validación en lote) |
| `minutosCompartidos(franjasA: FranjaHoraria[], franjasB: FranjaHoraria[]): number` | Total de minutos de intersección entre dos conjuntos |
| `bloquesContinuos(franjasA: FranjaHoraria[], franjasB: FranjaHoraria[], duracionMin: number): number` | Cantidad de bloques continuos ≥ `duracionMin` minutos |
| `tieneBloqueSuficiente(franjasA: FranjaHoraria[], franjasB: FranjaHoraria[], duracionMin: number): boolean` | `bloquesContinuos(...) >= 1` |

### Reglas de franjas

- **Día:** 1 = lunes, 7 = domingo (ISO 8601).
- **Formato de hora:** `"HH:mm"` en la zona horaria de la institución.
- **No cruzan medianoche:** `horaFin > horaInicio` siempre.
- **Solape:** dos franjas se solapan si están en el mismo día y sus intervalos de tiempo se intersecan.
- Las franjas de un mismo tutor o solicitud no deben solaparse entre sí.

---

## Estructura de archivos propuesta

```
packages/matching/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # API pública: evaluar, validarConfig, franjas.*
│   ├── evaluar.ts                # orquestación: elegibilidad → score → desempate → justificación
│   ├── elegibilidad.ts           # filtra candidatos, devuelve elegibles + descartados con motivos
│   ├── criterios/
│   │   ├── index.ts              # registro de evaluadores
│   │   ├── dominio.ts            # nivelDominio / 5
│   │   ├── horario.ts            # min(1, minutosCompartidos / ideal)
│   │   ├── prioridad.ts          # nivelPrioridad / 5
│   │   ├── preferencias.ts       # cumplidas / declaradas
│   │   └── carga.ts              # 1 - activas / capacidad
│   ├── desempate.ts              # comparador determinista
│   ├── justificacion.ts          # generador de texto por plantilla
│   ├── config.ts                 # validarConfig()
│   └── franjas/
│       ├── index.ts              # API pública de franjas
│       ├── validar.ts
│       ├── solapes.ts
│       └── compartidos.ts
└── __tests__/
    ├── evaluar.test.ts           # casos dorados
    ├── elegibilidad.test.ts
    ├── criterios/
    │   ├── dominio.test.ts
    │   ├── horario.test.ts
    │   ├── prioridad.test.ts
    │   ├── preferencias.test.ts
    │   └── carga.test.ts
    ├── desempate.test.ts
    ├── justificacion.test.ts
    ├── config.test.ts
    ├── franjas/
    │   ├── validar.test.ts
    │   ├── solapes.test.ts
    │   └── compartidos.test.ts
    └── propiedades.test.ts       # fast-check: score ∈ [0,100], determinismo, monotonicidad
```

---

## Errores

El motor no lanza excepciones de negocio: devuelve `SIN_CANDIDATOS` con la lista de descartados y sus motivos. Las únicas excepciones posibles son por datos de entrada inválidos (config con pesos que no suman 1, franjas mal formadas).

| Situación | Comportamiento |
| --- | --- |
| Config inválida | `validarConfig()` retorna `false`; el servicio de Recomendaciones decide si lanza error |
| Candidatos vacío (array vacío) | Retorna `{ resultado: 'SIN_CANDIDATOS', descartados: [], justificacion: '...' }` |
| Todos descartados | Retorna `SIN_CANDIDATOS` con los motivos de cada descartado |
| Franjas inválidas en input | Se espera que el servicio valide antes; el motor confía en su entrada |

---

## Pruebas

### Casos dorados obligatorios (unitarios)

| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | Sin candidatos (array vacío) | `SIN_CANDIDATOS`, justificación informativa |
| 2 | Un solo candidato elegible | `RECOMENDADO`, posición 1, 0 alternativas |
| 3 | Empate de score entre 2 tutores | Desempate determinista por prioridad, carga, etc. |
| 4 | Tutor sin cupo (`activas >= capacidad`) | Descartado con motivo `SIN_CUPO` |
| 5 | Sin horario compatible (franjas no se solapan) | Descartado con motivo `SIN_HORARIO_COMPATIBLE` |
| 6 | Franjas que se tocan sin solaparse (ej. 14:00–15:00 y 15:00–16:00) | No son solape; se tratan como bloques separados |
| 7 | Solicitud con varias franjas en distintos días | `minutosCompartidos` los suma correctamente |
| 8 | Sin preferencias declaradas | `preferencias` criterio = 1.0 |
| 9 | 5+ candidatos, `topN = 3` | 1 recomendado + 2 alternativas |
| 10 | Todos los candidatos descartados (mezcla de motivos) | `SIN_CANDIDATOS`, cada descartado con sus motivos |

### Tests de propiedades (fast-check)

| Propiedad | Descripción |
| --- | --- |
| Score en rango | `0 ≤ score ≤ 100` para todo candidato elegible |
| Determinismo | Mismo input → mismo output, siempre |
| Monotonicidad de prioridad | Subir `nivelPrioridad` de un tutor nunca baja su score (los demás datos iguales) |
| Monotonicidad de dominio | Subir `nivelDominio` nunca baja el score |
| Consistencia del ranking | El recomendado tiene score ≥ que todas las alternativas |
| Alternativas ordenadas | Las alternativas están ordenadas por score descendente |

### Tests de franjas (unitarios)

| Caso | Esperado |
| --- | --- |
| Franja válida (lun 09:00–10:00) | `validarFranja` → `true` |
| `horaFin <= horaInicio` | → `false` |
| `dia` fuera de rango | → `false` |
| Dos franjas mismo día, se solapan | `haySolape` → `true` |
| Dos franjas mismo día, contiguas sin solape | `haySolape` → `false` |
| Dos franjas distinto día | `haySolape` → `false` |
| Minutos compartidos entre dos conjuntos | Cálculo correcto |
| `tieneBloqueSuficiente` con duración 60 y bloque de 45 | → `false` |
| `tieneBloqueSuficiente` con duración 60 y bloque de 90 | → `true` |

### Reglas de lint

- `packages/matching` **no puede importar** Express ni Knex (regla ESLint).
- Sin dependencias de I/O de ningún tipo.

---

## Definition of Done (Fase F6)

- [ ] Casos dorados: sin candidatos, empate, un solo candidato, sin preferencias, tutor sin cupo, franjas que se tocan sin solaparse, solicitud con varias franjas.
- [ ] Propiedades: score entre 0 y 100; mismo input, mismo output; subir la prioridad nunca baja el score.
- [ ] Todas las ramas de elegibilidad y desempate cubiertas.
- [ ] Sin dependencias de Express ni Knex (regla de lint).
- [ ] Justificación de 280 caracteres o menos que nombra el criterio de mayor aporte.
- [ ] Utilidades de franjas entregadas primero (desbloquean a Dev 2 y Dev 3).

---

## Cómo correrlo

```bash
# Desde la raíz del monorepo
docker compose up -d db          # solo si se necesita para otros tests
npm run test -w packages/matching    # tests unitarios y de propiedades
npm run build -w packages/matching   # compilar
npm run lint -w packages/matching    # lint (incluye regla de no-import Express/Knex)
```

---

## Orden de implementación recomendado

1. **Primero:** Utilidades de franjas (`packages/matching/franjas`) — desbloquea a Dev 2 y Dev 3.
2. **Segundo:** `evaluar()` con elegibilidad y criterios — corazón del motor.
3. **Tercero:** Justificación y `validarConfig()`.
4. **Al final:** Tests de propiedades con fast-check y refinamiento.
