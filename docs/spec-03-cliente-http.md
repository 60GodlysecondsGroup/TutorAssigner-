# Spec 03 — Cliente HTTP y Manejo de Errores en el Frontend

## Objetivo y contexto

Implementar el cliente HTTP centralizado (`apps/web/src/shared/api/http.ts`) que todas las features usan para comunicarse con el backend. El cliente estandariza la base URL, el manejo de cookies de sesión, el desenvolvimiento del sobre de respuesta y la conversión de errores HTTP a un tipo `ApiError` manejable.

Dev 5 es dueño de `apps/web/src/shared/` y este módulo es la capa de comunicación que conecta el frontend con el API Express.

Corresponde a la fase **F3** del plan arquitectónico.

## Requerimientos funcionales

1. **Base URL:** Todas las peticiones van a `/api/v1` (el proxy de Vite redirige al API en desarrollo).
2. **Envío de credenciales:** Las cookies de sesión (`httpOnly`) se envían automáticamente con `credentials: 'include'`.
3. **Desenvolvimiento del sobre:** Las respuestas exitosas vienen en formato `{ data: T }` o `{ data: T[], meta: PageMeta }`. El cliente devuelve directamente `T` o `{ data: T[], meta }` según corresponda.
4. **Conversión de errores:** Las respuestas de error vienen en formato `{ error: { code, message, details?, requestId } }`. El cliente las convierte a una instancia de `ApiError`.
5. **Manejo automático de 401:** Si la respuesta es 401, se dispara el flujo "sesión expirada" (redirige a `/login`).
6. **Manejo de 403:** Muestra un mensaje "sin permiso".
7. **Mapeo de errores de validación (400):** Los `details[].path` se mapean a campos del formulario para mostrar errores inline.
8. **Manejo de 409:** Se muestra como aviso accionable (ejemplo: "La recomendación quedó desactualizada. Regenerar").

## Requerimientos técnicos

- Usar `fetch` nativo (no Axios) para minimizar dependencias.
- TypeScript estricto.
- Estructura:
  ```
  apps/web/src/shared/api/
  ├── http.ts           Cliente HTTP con métodos get, post, put, patch, delete
  ├── http.test.ts      Tests del cliente
  ├── errors.ts         Clase ApiError y utilidades
  └── index.ts          Barrel export
  ```

## API del cliente HTTP

```ts
// http.ts
const http = {
  get<T>(url: string, params?: Record<string, string>): Promise<T>,
  post<T>(url: string, body?: unknown): Promise<T>,
  put<T>(url: string, body?: unknown): Promise<T>,
  patch<T>(url: string, body?: unknown): Promise<T>,
  delete<T>(url: string): Promise<T>,
};

export default http;
```

## Clase ApiError

```ts
// errors.ts
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: { path: string; message: string }[],
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Verifica si el error es de un código específico */
  is(code: string): boolean;

  /** Obtiene errores de validación como mapa campo → mensaje */
  getFieldErrors(): Record<string, string>;

  /** Verifica si es un error de validación */
  get isValidation(): boolean;

  /** Verifica si es un conflicto */
  get isConflict(): boolean;
}
```

## Comportamiento esperado

### Flujo de una petición exitosa
1. El feature llama `http.get<Tutor[]>('/tutores')`.
2. El cliente envía `GET /api/v1/tutores` con `credentials: 'include'`.
3. El backend responde `{ data: [...] }`.
4. El cliente devuelve el array de tutores directamente.

### Flujo con paginación
1. El feature llama `http.get<PageResponse<Solicitud>>('/solicitudes?page=1&pageSize=20')`.
2. El backend responde `{ data: [...], meta: { page: 1, pageSize: 20, total: 45 } }`.
3. El cliente devuelve `{ data: [...], meta: {...} }`.

### Flujo de error
1. El feature llama `http.post('/recomendaciones', { solicitudId })`.
2. El backend responde 409 con `{ error: { code: 'SOLICITUD_NO_ABIERTA', message: '...', requestId: '...' } }`.
3. El cliente lanza `new ApiError('SOLICITUD_NO_ABIERTA', 409, '...', undefined, '...')`.
4. El feature captura el error y muestra un aviso accionable.

### Flujo de 401
1. Cualquier petición recibe 401.
2. El cliente detecta el 401 antes de lanzar el error.
3. Dispara un evento o callback que el `AuthProvider` escucha para limpiar la sesión y redirigir a `/login`.
4. Opcionalmente muestra un toast "Sesión expirada".

## Criterios de aceptación

- [ ] `http.get` desenvuelve `{ data }` correctamente.
- [ ] `http.get` con paginación preserva `{ data, meta }`.
- [ ] `http.post` envía JSON con `Content-Type: application/json`.
- [ ] Las cookies se envían con `credentials: 'include'`.
- [ ] Un 400 se convierte en `ApiError` con `details` mapeables a campos.
- [ ] Un 401 redirige a `/login` (flujo de sesión expirada).
- [ ] Un 403 genera `ApiError` con código `FORBIDDEN`.
- [ ] Un 404 genera `ApiError` con el código del módulo.
- [ ] Un 409 genera `ApiError` con el código de conflicto.
- [ ] Un 500 genera `ApiError` con código `INTERNAL_ERROR`.
- [ ] Tests para cada código de estado: 400, 401, 403, 404, 409, 500.
- [ ] `ApiError.getFieldErrors()` mapea `details[].path` a un objeto `{ campo: mensaje }`.

## Dependencias

| Dependencia | Módulo/Rol | Tipo |
|-------------|-----------|------|
| Formato de sobre (`Ok<T>`, `Page<T>`, `ApiError`) | Dev 1 — `@tutorias/contracts/common` | Tipos del sobre |
| `AuthProvider` | Dev 1 (F9) / Dev 5 (stub) | Para manejar 401 |
| Proxy de Vite | Dev 5 (F3) | `/api` → `http://api:3000` |

## Validaciones y casos límite

- Si la respuesta no es JSON válido (por ejemplo, HTML de un proxy caído), el cliente debe lanzar un `ApiError` genérico con código `NETWORK_ERROR`.
- Si la red falla (`fetch` rechaza), lanzar `ApiError` con código `NETWORK_ERROR`.
- Headers `Content-Type: application/json` solo se envían cuando hay body.
- Las peticiones GET no envían body.
- Los parámetros de query se codifican correctamente con `URLSearchParams`.

## Notas de implementación

- El interceptor de 401 no debe causar loops: si `/auth/me` responde 401, no redirige infinitamente.
- El cliente es stateless: no guarda tokens ni headers de sesión; la cookie `httpOnly` lo maneja el navegador.
- Los tests usan `vi.fn()` para mockear `fetch` o MSW para interceptar peticiones.
