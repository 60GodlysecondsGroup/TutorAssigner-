# Spec 04 — WeeklyScheduleInput (Selector de Franjas Semanales)

## Objetivo y contexto

Implementar el componente `WeeklyScheduleInput` que permite al usuario editar una lista de franjas horarias semanales (`FranjaHoraria[]`). Este componente lo usan las features de Tutores (Dev 2) y Solicitudes (Dev 3) para definir la disponibilidad de tutores y las franjas disponibles de los estudiantes.

Vive en `apps/web/src/shared/ui/` y es propiedad de Dev 5. Sus props se fijan en la fase F1 para que Dev 2 y Dev 3 puedan maquetar desde el inicio.

Corresponde a las fases **F1** (definición de props) y **F3** (implementación) del plan arquitectónico.

## Requerimientos funcionales

1. **Visualización semanal:** Muestra los 7 días de la semana (lunes a domingo, ISO: 1 = lunes).
2. **Agregar franja:** El usuario selecciona un día, una hora de inicio y una hora de fin para agregar una franja.
3. **Eliminar franja:** Cada franja tiene un botón para eliminarla.
4. **Validación de hora fin > hora inicio:** No se permite crear una franja donde `fin ≤ inicio`.
5. **Validación de no solapamiento:** No se permiten franjas solapadas dentro del mismo día para el mismo tutor/solicitud (validación visual en el componente).
6. **Formato:** Las horas se manejan en formato `HH:mm` (24h).
7. **Valor controlado:** El componente es controlado (`value` + `onChange`).

## Requerimientos técnicos

- TypeScript estricto.
- Integración con React Hook Form (compatible con `Controller`).
- Usa el tipo `FranjaHoraria` de `@tutorias/contracts/matching`.
- Estructura:
  ```
  apps/web/src/shared/ui/WeeklyScheduleInput/
  ├── WeeklyScheduleInput.tsx
  ├── WeeklyScheduleInput.module.css
  ├── WeeklyScheduleInput.test.tsx
  └── index.ts
  ```

## Tipo FranjaHoraria (del contrato)

```ts
// @tutorias/contracts/matching
type FranjaHoraria = {
  dia: 1 | 2 | 3 | 4 | 5 | 6 | 7;  // ISO: 1 = lunes, 7 = domingo
  inicio: string;  // 'HH:mm'
  fin: string;     // 'HH:mm'
};
```

## Props del componente

```ts
interface WeeklyScheduleInputProps {
  /** Lista actual de franjas */
  value: FranjaHoraria[];
  /** Callback cuando cambian las franjas */
  onChange: (franjas: FranjaHoraria[]) => void;
  /** Deshabilitar edición */
  disabled?: boolean;
  /** Mensaje de error externo (ej. de validación del servidor) */
  error?: string;
  /** Etiqueta del componente */
  label?: string;
  /** Incremento de minutos en los selectores de hora (default: 30) */
  step?: number;
}
```

## Comportamiento esperado

### Visualización
- Las franjas se agrupan por día y se muestran ordenadas por hora de inicio.
- Cada día muestra su nombre (Lunes, Martes, ..., Domingo).
- Las franjas se muestran como "HH:mm – HH:mm" con un botón de eliminar (×).
- Si no hay franjas para un día, se muestra un estado vacío sutil.

### Agregar franja
1. El usuario selecciona un día del dropdown.
2. Selecciona hora de inicio y hora de fin (selectores con incremento `step`).
3. Hace clic en "Agregar".
4. Si `fin > inicio` y no hay solapamiento → se agrega la franja y se llama `onChange`.
5. Si `fin ≤ inicio` → se muestra error "La hora de fin debe ser posterior a la hora de inicio".
6. Si hay solapamiento → se muestra error "Esta franja se solapa con otra existente".

### Eliminar franja
1. El usuario hace clic en el botón × de una franja.
2. La franja se elimina del array y se llama `onChange`.

### Validación de solapamiento
- Dos franjas se solapan si comparten el mismo día Y sus rangos de tiempo se intersectan.
- Ejemplo: L 14:00–16:00 y L 15:00–17:00 se solapan.
- Ejemplo: L 14:00–16:00 y L 16:00–18:00 NO se solapan (se tocan pero no se solapan).
- La lógica de solapamiento se alinea con `packages/matching/franjas` pero se implementa localmente en el componente para feedback inmediato.

## Criterios de aceptación

- [ ] Se pueden agregar franjas seleccionando día, hora inicio y hora fin.
- [ ] Se pueden eliminar franjas individuales.
- [ ] Rechaza franjas con `fin ≤ inicio` mostrando mensaje de error.
- [ ] Rechaza franjas que se solapan con una existente mostrando mensaje de error.
- [ ] Las franjas se agrupan por día y se ordenan por hora.
- [ ] El componente funciona como componente controlado (`value` + `onChange`).
- [ ] Es compatible con React Hook Form `Controller`.
- [ ] Test: agregar una franja válida.
- [ ] Test: rechazar `fin ≤ inicio`.
- [ ] Test: rechazar franja solapada.
- [ ] Test: eliminar una franja.
- [ ] Test: franjas que se tocan (mismo fin/inicio) se permiten.
- [ ] El componente se deshabilita con `disabled=true`.

## Dependencias

| Dependencia | Módulo/Rol | Tipo |
|-------------|-----------|------|
| `FranjaHoraria` | Dev 4 — `@tutorias/contracts/matching` | Tipo del contrato |
| `packages/matching/franjas` | Dev 4 | Referencia para lógica de solapamiento (el componente tiene su propia validación local) |
| React Hook Form | Stack | Para integración con formularios |

## Validaciones y casos límite

- Día 7 (domingo) se maneja correctamente.
- Franjas contiguas (L 08:00–10:00 y L 10:00–12:00) son válidas.
- Franja con inicio = fin (ej. 14:00–14:00) se rechaza.
- Si `step=30`, las opciones de hora son :00 y :30 de cada hora.
- Si `step=15`, las opciones son :00, :15, :30, :45.
- El componente no valida duraciones mínimas de sesión; eso lo hace el backend.
- Array vacío es un valor válido (sin franjas definidas).

## Notas de implementación

- Las props se congelan en F1 para que Dev 2 y Dev 3 empiecen a integrar.
- La validación de solapamiento en el componente es para UX inmediato; la validación autoritativa está en el backend con `packages/matching/franjas`.
- No cruza medianoche (supuesto S-02 del plan).
