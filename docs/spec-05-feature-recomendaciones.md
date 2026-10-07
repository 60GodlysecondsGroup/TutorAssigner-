# Spec 05 — Feature Recomendaciones (Frontend)

## Objetivo y contexto

Implementar la feature de recomendaciones en el frontend: la parte más rica de la UI, donde el coordinador ve, entiende y confirma la recomendación de tutor para una solicitud. Incluye la página de recomendación con ranking, desglose por criterio, justificación, descartados con motivo, confirmación o selección de alternativa, regeneración y historial.

Dev 5 es dueño de `apps/web/src/features/recomendaciones/`. El backend de recomendaciones (Dev 4) expone los endpoints que esta feature consume.

Corresponde a la fase **F8 — Recomendaciones, asignaciones y dashboard (frontend)**.

**Requisitos que cubre:** RC-05, RC-06, RC-07, RC-08 (visualización), S-09, S-10.

## Requerimientos funcionales

### Página de Recomendación (`/solicitudes/:id/recomendacion`)

1. **Generación automática:** Si la solicitud no tiene recomendación activa, la página la genera automáticamente al cargarse llamando a `POST /recomendaciones { solicitudId }`.
2. **Ranking de candidatos:**
   - Muestra el tutor recomendado destacado en primer lugar.
   - Muestra las 2–3 alternativas siguientes (configurado por `topN`).
   - Cada candidato muestra: nombre, score (0–100), posición.
3. **Desglose por criterio:**
   - Para cada candidato elegible, muestra los criterios con su valor (0–1), peso, aporte al score y evidencia textual.
   - Los criterios son: `dominio`, `horario`, `prioridad`, `preferencias`, `carga`.
   - **Ningún cálculo de score se hace en el cliente.** Se muestra exactamente lo que devuelve el API.
4. **Justificación:** Texto generado por el backend (≤ 280 caracteres) que explica por qué se recomienda al tutor.
5. **Descartados:** Lista de tutores descartados con su(s) motivo(s): `SIN_HORARIO_COMPATIBLE`, `SIN_CUPO`. Muestra en texto legible.
6. **Confirmar recomendado:** Botón para confirmar la asignación del tutor recomendado → `POST /asignaciones`.
7. **Elegir alternativa:** El coordinador puede seleccionar una alternativa. Si elige un tutor diferente al recomendado, se le pide un `motivoCambio` obligatorio.
8. **Regenerar:** Botón para regenerar la recomendación (por si los datos cambiaron). La anterior queda en el historial.
9. **Historial:** Sección colapsable que muestra las recomendaciones previas de esta solicitud (`GET /recomendaciones?solicitudId=`).
10. **Sin candidatos:** Si el resultado es `SIN_CANDIDATOS`, muestra un estado especial con la justificación ("No hay tutores elegibles: 3 sin horario compatible, 1 sin cupo") y botón de regenerar.

### Resumen de la solicitud
- La página muestra en la parte superior un resumen de la solicitud: estudiante, materia, tema, duración, franjas, preferencias.

## Requerimientos técnicos

- React + TypeScript.
- TanStack Query para gestión de estado del servidor.
- React Hook Form + Zod para el formulario de motivo de cambio.
- Estructura:
  ```
  apps/web/src/features/recomendaciones/
  ├── index.ts                       Manifiesto de la feature
  ├── routes.tsx                     Rutas de la feature
  ├── api/recomendaciones.api.ts     Llamadas HTTP tipadas
  ├── api/recomendaciones.queries.ts Hooks de TanStack Query + query keys
  ├── pages/
  │   └── RecomendacionPage.tsx      Página principal
  ├── components/
  │   ├── RankingCard.tsx            Candidato con score y desglose
  │   ├── CriterioDesglose.tsx       Fila de criterio: valor, peso, aporte, evidencia
  │   ├── Justificacion.tsx          Texto de justificación
  │   ├── DescartadosList.tsx        Lista de tutores descartados
  │   ├── ConfirmarAsignacion.tsx    Modal/sección de confirmación
  │   ├── MotivoDialog.tsx           Modal para motivo de cambio
  │   ├── HistorialRecomendaciones.tsx Historial colapsable
  │   └── SinCandidatos.tsx          Estado sin candidatos
  ├── mocks/handlers.ts              Handlers MSW
  └── *.test.tsx
  ```

## Endpoints consumidos

| Método | Endpoint | Uso |
|--------|----------|-----|
| `POST` | `/recomendaciones` | Generar recomendación para una solicitud |
| `GET` | `/recomendaciones?solicitudId=:id` | Historial de recomendaciones de la solicitud |
| `GET` | `/recomendaciones/:id` | Detalle de una recomendación |
| `POST` | `/asignaciones` | Confirmar asignación |
| `GET` | `/solicitudes/:id` | Datos de la solicitud (de Dev 3) |

## DTOs consumidos (del contrato de Dev 4)

```ts
// Recomendación
interface Recomendacion {
  id: string;
  solicitudId: string;
  configId: string;
  resultado: 'RECOMENDADO' | 'SIN_CANDIDATOS';
  tutorRecomendadoId?: string;
  score?: number;
  justificacion: string;
  candidatos: CandidatoEvaluado[];
  descartados: { tutorId: string; nombre: string; motivos: MotivoDescarte[] }[];
  configVersion: number;
  createdAt: string;
}

interface CandidatoEvaluado {
  tutorId: string;
  nombre: string;
  posicion: number;
  score: number;
  desglose: {
    criterio: 'dominio' | 'horario' | 'prioridad' | 'preferencias' | 'carga';
    valor: number;
    peso: number;
    aporte: number;
    evidencia: string;
  }[];
}

type MotivoDescarte = 'SIN_HORARIO_COMPATIBLE' | 'SIN_CUPO';
```

## Comportamiento esperado

### Flujo principal: Confirmar recomendado
1. El coordinador navega a `/solicitudes/:id/recomendacion` (normalmente desde crear solicitud).
2. La página detecta que no hay recomendación y genera una automáticamente.
3. Se muestra el estado de carga con spinner.
4. Aparece el ranking: recomendado + alternativas con desglose.
5. El coordinador lee la justificación.
6. Hace clic en "Confirmar asignación".
7. Se llama `POST /asignaciones { recomendacionId, tutorId }`.
8. Éxito → toast de confirmación → navega a la vista de la solicitud o al dashboard.

### Flujo alternativo: Elegir otro tutor
1. Mismos pasos 1–4.
2. El coordinador hace clic en "Seleccionar" en una alternativa.
3. Se abre un modal pidiendo `motivoCambio` (obligatorio).
4. El coordinador escribe el motivo y confirma.
5. Se llama `POST /asignaciones { recomendacionId, tutorId, motivoCambio }`.
6. Éxito → toast → navegación.

### Flujo de error 409
1. Al confirmar, el backend responde 409 con código `RECOMENDACION_OBSOLETA`.
2. Se muestra un aviso: "La recomendación quedó desactualizada. Los datos han cambiado."
3. Se ofrece botón "Regenerar recomendación".

### Flujo sin candidatos
1. La recomendación tiene `resultado: 'SIN_CANDIDATOS'`.
2. Se muestra la justificación ("No hay tutores elegibles...").
3. Se muestra la lista de descartados con motivos legibles.
4. Se ofrece botón "Regenerar" por si los datos cambian.

## Criterios de aceptación

- [ ] La recomendación se genera automáticamente si no existe.
- [ ] El ranking muestra recomendado + alternativas con score.
- [ ] Cada candidato muestra desglose: criterio, valor, peso, aporte, evidencia.
- [ ] La justificación se muestra tal cual llega del API.
- [ ] Ningún cálculo de score se realiza en el frontend.
- [ ] Los descartados muestran motivos legibles ("Sin horario compatible", "Sin cupo").
- [ ] Confirmar recomendado funciona sin pedir motivo.
- [ ] Elegir alternativa exige motivo de cambio.
- [ ] Error 409 muestra aviso accionable con opción de regenerar.
- [ ] Estado sin candidatos muestra justificación y botón de regenerar.
- [ ] El historial muestra recomendaciones previas.
- [ ] Estados de carga, error y sin candidatos visibles y probados.
- [ ] Tests de componentes con MSW.
- [ ] Con API real (H4), el flujo crear solicitud → confirmar funciona.

## Dependencias

| Dependencia | Módulo/Rol | Tipo | Estado |
|-------------|-----------|------|--------|
| `POST /recomendaciones` | Dev 4 | Endpoint | MSW hasta H4 |
| `GET /recomendaciones` | Dev 4 | Endpoint | MSW hasta H4 |
| `POST /asignaciones` | Dev 4 | Endpoint | MSW hasta H4 |
| `GET /solicitudes/:id` | Dev 3 | Endpoint (datos de la solicitud) | MSW hasta H4 |
| Contratos de `@tutorias/contracts/recomendaciones` | Dev 4 | Tipos y fixtures | Necesario desde F1 |
| Shell y router (spec-01) | Dev 5 | Ruta registrada | Necesario |
| Kit de UI (spec-02) | Dev 5 | Componentes base | Necesario |
| Cliente HTTP (spec-03) | Dev 5 | Comunicación con API | Necesario |

## Validaciones y casos límite

- La solicitud no existe (404) → mostrar error.
- La solicitud no está ABIERTA (409) → mostrar "La solicitud ya fue asignada/cancelada".
- El backend tarda en generar la recomendación → spinner con mensaje "Calculando recomendación...".
- La lista de candidatos es exactamente 1 (sin alternativas) → no mostrar sección de alternativas.
- Motivo de cambio vacío → validar en el formulario antes de enviar.
- El usuario navega directamente a `/solicitudes/:id/recomendacion` sin haber creado la solicitud → flujo normal si existe.

## Notas de implementación

- El traspaso entre features se hace por ruta: Solicitudes (Dev 3) navega a `/solicitudes/:id/recomendacion` y Dev 5 toma el control. El contrato es solo la ruta y su parámetro `id`.
- Al confirmar una asignación, se invalidan las queries de solicitudes y dashboard (invalidación cruzada con fábrica de query keys).
- Los handlers MSW usan los fixtures del contrato de Dev 4.
