# Spec 06 — Feature Asignaciones (Frontend)

## Objetivo y contexto

Implementar la vista de asignaciones en el frontend, donde el coordinador puede ver las asignaciones activas y finalizadas del sistema. Esta vista forma parte de la feature de recomendaciones (`apps/web/src/features/recomendaciones/`) y se accede desde `/asignaciones`.

Dev 5 es dueño de esta funcionalidad. El backend de asignaciones (Dev 4) expone los endpoints consumidos.

Corresponde a la fase **F8** del plan arquitectónico. Cubre el supuesto **S-10** (confirmación de asignaciones).

## Requerimientos funcionales

1. **Lista de asignaciones:** Tabla paginada con las asignaciones del sistema.
2. **Filtros:**
   - Por estado: `ACTIVA`, `FINALIZADA`, `CANCELADA`, o todas.
   - Por tutor (selector o búsqueda).
3. **Información mostrada por asignación:**
   - Estudiante (nombre)
   - Tutor asignado (nombre)
   - Materia
   - Score de la recomendación
   - Estado (badge con color)
   - Fecha de creación
   - Motivo de cambio (si existe, indica que no se eligió al recomendado)
4. **Acciones por asignación:**
   - **Finalizar:** Cambia el estado a `FINALIZADA` → `PATCH /asignaciones/:id { estado: 'FINALIZADA' }`.
   - **Cancelar:** Cambia el estado a `CANCELADA` → `PATCH /asignaciones/:id { estado: 'CANCELADA' }`.
   - Ambas acciones requieren confirmación con `ConfirmDialog`.
5. **Detalle:** Al hacer clic en una asignación, navegar a la solicitud correspondiente o mostrar detalle inline.

## Requerimientos técnicos

- React + TypeScript.
- TanStack Query para datos paginados.
- Estructura dentro de `apps/web/src/features/recomendaciones/`:
  ```
  features/recomendaciones/
  ├── pages/
  │   ├── RecomendacionPage.tsx     (spec-05)
  │   └── AsignacionesPage.tsx      (esta spec)
  ├── components/
  │   ├── AsignacionesTable.tsx
  │   ├── AsignacionRow.tsx
  │   ├── AsignacionFilters.tsx
  │   └── CambiarEstadoDialog.tsx
  └── api/
      └── asignaciones.api.ts
      └── asignaciones.queries.ts
  ```

## Endpoints consumidos

| Método | Endpoint | Uso |
|--------|----------|-----|
| `GET` | `/asignaciones?tutorId=&estado=&page=` | Lista paginada con filtros |
| `PATCH` | `/asignaciones/:id` | Cambiar estado (finalizar, cancelar) |

## DTO de Asignación (del contrato de Dev 4)

```ts
interface Asignacion {
  id: string;
  solicitudId: string;
  tutorId: string;
  tutorNombre: string;
  estudianteNombre: string;
  materiaNombre: string;
  recomendacionId?: string;
  score?: number;
  motivoCambio?: string;
  estado: 'ACTIVA' | 'FINALIZADA' | 'CANCELADA';
  creadaPor: string;
  createdAt: string;
  updatedAt: string;
}
```

## Comportamiento esperado

### Vista inicial
1. Al navegar a `/asignaciones`, se cargan las asignaciones con estado `ACTIVA` por defecto.
2. Se muestra la tabla paginada con la información de cada asignación.
3. Los badges de estado usan colores: `ACTIVA` → success (verde), `FINALIZADA` → neutral (gris), `CANCELADA` → danger (rojo).

### Filtrar
1. El coordinador selecciona un estado diferente o busca por tutor.
2. La tabla se recarga con los filtros aplicados.
3. La paginación se reinicia a página 1.

### Finalizar asignación
1. El coordinador hace clic en "Finalizar" en una asignación activa.
2. Se abre `ConfirmDialog`: "¿Finalizar la tutoría de [tutor] con [estudiante] en [materia]?"
3. Confirma → `PATCH /asignaciones/:id { estado: 'FINALIZADA' }`.
4. Éxito → toast "Asignación finalizada" → se invalida la lista.

### Cancelar asignación
1. Similar al flujo de finalizar pero con variante `danger`.
2. El `ConfirmDialog` advierte que la solicitud podrá recibir nueva recomendación.

### Transición inválida (409)
1. Si la asignación ya fue finalizada/cancelada por otro usuario → 409.
2. Mostrar toast de error y recargar la lista.

## Criterios de aceptación

- [ ] La tabla muestra asignaciones con toda la información requerida.
- [ ] El filtro por estado funciona correctamente.
- [ ] El filtro por tutor funciona correctamente.
- [ ] La paginación funciona con los controles del kit de UI.
- [ ] Finalizar una asignación cambia su estado y actualiza la tabla.
- [ ] Cancelar una asignación cambia su estado y actualiza la tabla.
- [ ] Las acciones de cambio de estado requieren confirmación.
- [ ] Error 409 (transición inválida) muestra mensaje apropiado.
- [ ] Solo las asignaciones `ACTIVA` muestran las acciones Finalizar/Cancelar.
- [ ] Las asignaciones con `motivoCambio` lo muestran visualmente (indicador o tooltip).
- [ ] Tests de componentes con MSW.

## Dependencias

| Dependencia | Módulo/Rol | Tipo |
|-------------|-----------|------|
| `GET/PATCH /asignaciones` | Dev 4 | Endpoints |
| Contratos de asignaciones | Dev 4 | Tipos y fixtures |
| Kit de UI: Table, Pagination, Badge, ConfirmDialog, Toast | Dev 5 (spec-02) | Componentes |
| Cliente HTTP (spec-03) | Dev 5 | Comunicación |

## Validaciones y casos límite

- Lista vacía → mostrar `EmptyState` ("No hay asignaciones con estos filtros").
- Error de red → mostrar `ErrorState` con opción de reintentar.
- Asignación sin `recomendacionId` (caso futuro de asignación manual) → no mostrar score.
- La invalidación de queries al cambiar estado debe actualizar también el dashboard.

## Notas de implementación

- La página de asignaciones comparte la feature `recomendaciones` porque en el backend son el mismo módulo. Comparten query keys y la API.
- Al finalizar o cancelar una asignación, invalidar también las queries de solicitudes (la solicitud puede volver a `ABIERTA` si se cancela la asignación).
