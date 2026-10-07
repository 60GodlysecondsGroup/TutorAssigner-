# Spec 02 — Kit de UI (Componentes Reutilizables)

## Objetivo y contexto

Implementar el conjunto de componentes reutilizables que todas las features del frontend utilizan. El kit de UI vive en `apps/web/src/shared/ui/` y lo mantiene Dev 5. Proporciona una base visual y funcional consistente para que Dev 1, Dev 2, Dev 3 y Dev 5 construyan sus pantallas sin duplicar componentes.

Corresponde a la fase **F3 — Shell frontend y kit de UI** del plan arquitectónico.

## Requerimientos funcionales

Cada componente debe:
- Ser genérico y reutilizable, sin lógica de negocio.
- Estar tipado con TypeScript.
- Tener un test básico de renderizado.
- Seguir las convenciones de CSS Modules para estilos.

### Lista de componentes

| Componente | Propósito | Props principales |
|------------|-----------|-------------------|
| `Button` | Acciones primarias, secundarias, peligrosas | `variant`, `size`, `loading`, `disabled`, `onClick` |
| `Input` | Campos de texto | `type`, `placeholder`, `error`, `disabled` |
| `Select` | Selector de opciones | `options`, `value`, `onChange`, `placeholder`, `error` |
| `FormField` | Envuelve un input con label y mensaje de error | `label`, `error`, `required`, `children` |
| `Table` | Tabla de datos con ordenamiento | `columns`, `data`, `onSort`, `sortBy`, `sortOrder` |
| `Pagination` | Navegación de páginas | `page`, `pageSize`, `total`, `onPageChange` |
| `Card` | Contenedor visual con título opcional | `title`, `children`, `actions` |
| `Badge` | Etiqueta de estado | `variant` (`success`, `warning`, `danger`, `info`, `neutral`), `children` |
| `Modal` | Diálogo modal | `open`, `onClose`, `title`, `children`, `size` |
| `ConfirmDialog` | Modal de confirmación destructiva | `open`, `onConfirm`, `onCancel`, `title`, `message`, `confirmLabel`, `variant` |
| `Toast` | Notificación temporal | `message`, `type` (`success`, `error`, `info`, `warning`), `duration` |
| `EmptyState` | Estado vacío de una lista o sección | `icon`, `title`, `description`, `action` |
| `ErrorState` | Estado de error con opción de reintentar | `title`, `message`, `onRetry` |
| `Spinner` | Indicador de carga | `size`, `centered` |

## Requerimientos técnicos

- CSS Modules (`.module.css`) para estilos, sin librerías de estilos externas obligatorias.
- TypeScript estricto para todas las props.
- Cada componente en su propio archivo dentro de `apps/web/src/shared/ui/`.
- Barrel export desde `apps/web/src/shared/ui/index.ts`.
- Estructura:
  ```
  apps/web/src/shared/ui/
  ├── index.ts
  ├── Button/
  │   ├── Button.tsx
  │   ├── Button.module.css
  │   └── Button.test.tsx
  ├── Input/
  │   ├── Input.tsx
  │   ├── Input.module.css
  │   └── Input.test.tsx
  ├── ... (mismo patrón para cada componente)
  ```

## Comportamiento esperado

### Button
- `variant`: `primary` | `secondary` | `danger` | `ghost`. Default: `primary`.
- `size`: `sm` | `md` | `lg`. Default: `md`.
- Cuando `loading=true`, muestra un spinner inline y deshabilita el botón.
- Aplica `type="button"` por defecto para evitar submits accidentales en formularios.

### FormField
- Muestra el `label` con un asterisco si `required=true`.
- Muestra el `error` debajo del campo en color de error.
- Conecta el label con el input mediante `htmlFor`/`id`.

### Table
- Las columnas se definen como `{ key: string; label: string; sortable?: boolean; render?: (row) => ReactNode }`.
- Al hacer clic en una columna sortable, llama `onSort(key)`.
- Muestra indicador visual de la dirección de ordenamiento.

### Pagination
- Calcula `totalPages` desde `total` y `pageSize`.
- Muestra "Mostrando X–Y de Z".
- Botones Anterior/Siguiente deshabilitados en los extremos.

### Modal
- Se cierra con Escape o clic fuera del contenido.
- Bloquea el scroll del body mientras está abierta.
- `size`: `sm` | `md` | `lg`.

### Toast
- Se auto-oculta después de `duration` ms (default: 4000).
- Permite cerrar manualmente.
- Se apilan verticalmente si hay múltiples.
- Accesible: `role="alert"` para errores, `role="status"` para info/success.

### EmptyState y ErrorState
- Centrados vertical y horizontalmente en su contenedor.
- `ErrorState` incluye botón "Reintentar" que llama `onRetry`.

## Criterios de aceptación

- [ ] Todos los componentes listados están implementados y exportados.
- [ ] Cada componente tiene al menos un test de renderizado.
- [ ] Los componentes usan CSS Modules, no estilos inline globales.
- [ ] `Button` con `loading=true` muestra spinner y se deshabilita.
- [ ] `Modal` se cierra con Escape y clic fuera.
- [ ] `Toast` se auto-oculta y se puede cerrar manualmente.
- [ ] `Pagination` calcula correctamente las páginas y deshabilita botones en los extremos.
- [ ] `Table` muestra indicador de ordenamiento en la columna activa.
- [ ] Los componentes son accesibles: labels, roles ARIA básicos, foco manejado en Modal.

## Dependencias

| Dependencia | Módulo/Rol | Tipo |
|-------------|-----------|------|
| React + TypeScript | Stack base | Obligatoria |
| CSS Modules | Vite built-in | Obligatoria |
| Vitest + Testing Library | Calidad | Para tests |

## Validaciones y casos límite

- `Select` sin opciones muestra el placeholder.
- `Table` sin datos muestra `EmptyState`.
- `Pagination` con `total=0` no muestra controles.
- `Modal` maneja correctamente el foco al abrir y cerrar (focus trap básico).
- `ConfirmDialog` requiere que el usuario haga clic explícito; no se cierra con Escape por defecto (es destructivo).

## Notas de implementación

- Los componentes NO contienen lógica de negocio ni llamadas a API.
- El `Toast` se gestiona a través del `ToastProvider` del shell (spec-01), con un hook `useToast()` que expone `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`.
- Dev 2 y Dev 3 usan estos componentes desde Foundation, por lo que deben estar listos temprano.
