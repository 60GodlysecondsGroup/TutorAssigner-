# Spec 01 — Shell Frontend y Registro de Features

## Objetivo y contexto

Implementar el shell de la aplicación SPA React + Vite que sirve como contenedor principal del frontend. El shell define el router, los providers globales, el layout con navegación, y el sistema de registro de features que permite a cada desarrollador conectar su feature sin editar archivos centrales.

Este módulo corresponde a la fase **F3 — Shell frontend y kit de UI** del plan arquitectónico. Dev 5 es el único dueño de `apps/web/src/app/` y es responsable de que cada feature solo tenga que llenar su carpeta para funcionar.

**Requisitos que cubre:** Infraestructura frontend para todas las funcionalidades (F1–F6).

## Requerimientos funcionales

1. **Router centralizado con manifiestos:** Cada feature exporta un manifiesto desde su `index.ts` con:
   - Rutas (path, componente lazy, roles permitidos)
   - Entrada de menú (label, icono, orden, roles)
   - Flag `enabled` (permite mergear features incompletas sin que aparezcan)
2. **Layout principal:**
   - Barra lateral o superior de navegación generada dinámicamente desde los manifiestos de features habilitadas
   - Área de contenido principal con `<Outlet />`
   - Indicador de usuario autenticado (nombre, rol) con opción de logout
3. **Providers globales** registrados en orden:
   - `QueryClientProvider` (TanStack Query)
   - `AuthProvider` (stub inicial que devuelve un coordinador ficticio)
   - `BrowserRouter` (React Router)
   - `ToastProvider` para notificaciones
4. **ErrorBoundary por ruta:** cada ruta se envuelve en un `ErrorBoundary` que muestra `ErrorState` sin romper el resto de la app.
5. **Guards de autenticación y autorización:**
   - `RequireAuth`: envuelve el layout; redirige a `/login` si no hay sesión.
   - `RequireRole`: se declara por ruta en el manifiesto; muestra "sin permiso" si el rol no coincide.
6. **Pre-cableado:** Todas las rutas del plan se registran en Foundation con páginas placeholder. Después nadie vuelve a tocar los archivos centrales del router.

## Requerimientos técnicos

- React + Vite con TypeScript
- React Router v6+ con rutas lazy (code splitting por feature)
- TanStack Query para estado de servidor
- Estructura de carpetas:
  ```
  apps/web/src/app/
  ├── App.tsx               Providers y router
  ├── router.tsx             Registro de rutas desde manifiestos
  ├── layout/
  │   ├── MainLayout.tsx     Layout con nav y outlet
  │   ├── Navigation.tsx     Menú desde manifiestos
  │   └── UserMenu.tsx       Info del usuario + logout
  ├── providers/
  │   ├── QueryProvider.tsx
  │   └── ToastProvider.tsx
  └── guards/
      ├── RequireAuth.tsx
      └── RequireRole.tsx
  ```

## Rutas pre-cableadas

| Ruta | Feature | Dueño | Placeholder |
|------|---------|-------|-------------|
| `/login` | auth | Dev 1 | Sí |
| `/` | dashboard | Dev 5 | Sí |
| `/materias` | materias | Dev 2 | Sí |
| `/tutores`, `/tutores/nuevo`, `/tutores/:id` | tutores | Dev 2 | Sí |
| `/estudiantes` | estudiantes | Dev 3 | Sí |
| `/solicitudes`, `/solicitudes/nueva`, `/solicitudes/:id` | solicitudes | Dev 3 | Sí |
| `/solicitudes/:id/recomendacion` | recomendaciones | Dev 5 | Sí |
| `/asignaciones` | recomendaciones | Dev 5 | Sí |
| `/configuracion/matching` | configuracion | Dev 5 | Sí |

## Interfaz del manifiesto de feature

```ts
interface FeatureManifest {
  name: string;
  enabled: boolean;
  routes: FeatureRoute[];
  menuItems: MenuItem[];
}

interface FeatureRoute {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType>;
  roles?: string[];  // si vacío, cualquier autenticado
}

interface MenuItem {
  label: string;
  path: string;
  icon?: string;
  order: number;
  roles?: string[];
}
```

## Comportamiento esperado

1. Al cargar la app, se registran todos los manifiestos de features con `enabled: true`.
2. El menú muestra solo las features habilitadas y cuyos roles coinciden con el usuario.
3. Las rutas inexistentes muestran una página 404.
4. Si un componente de ruta lanza un error, el `ErrorBoundary` lo captura y muestra `ErrorState` con opción de reintentar.
5. El `AuthProvider` stub devuelve `{ id: 'dev-user', nombre: 'Coordinador Dev', email: 'admin@dev.local', rol: 'COORDINADOR' }` hasta que Dev 1 entregue F9.
6. Las features con `enabled: false` no generan rutas ni entradas de menú.

## Criterios de aceptación

- [ ] Todas las rutas del plan abren su placeholder dentro del contenedor web.
- [ ] El menú de navegación se genera dinámicamente desde los manifiestos.
- [ ] Features con `enabled: false` no aparecen en el menú ni son accesibles.
- [ ] `RequireAuth` redirige a `/login` cuando no hay sesión.
- [ ] `RequireRole` muestra "sin permiso" cuando el rol no coincide.
- [ ] `ErrorBoundary` captura errores por ruta sin romper la app.
- [ ] `vite build` pasa sin errores.
- [ ] El `AuthProvider` stub permite navegar sin backend.

## Dependencias

| Dependencia | Módulo/Rol | Tipo | Estado |
|-------------|-----------|------|--------|
| `@tutorias/contracts/common` | Dev 1 | Tipos comunes (sobre, errores) | Necesario para F3 |
| Manifiestos de features | Dev 1–5 | Cada feature exporta su manifiesto | Pre-cableado con placeholders |
| `AuthProvider` real | Dev 1 (F9) | Reemplaza el stub | No bloqueante |

## Validaciones y casos límite

- Si un manifiesto de feature tiene rutas duplicadas, el router debe lanzar un error claro en desarrollo.
- Si el `AuthProvider` no está listo, el stub permite trabajar sin backend.
- Las rutas protegidas deben funcionar correctamente tanto con el stub como con el provider real.
- El layout debe ser responsivo (funcional en pantallas ≥ 768px; no se requiere mobile en el MVP).

## Notas de implementación

- No usar Redux, Zustand ni ningún store global de cliente: `useState` para UI local, TanStack Query para datos del servidor.
- El router usa `React.lazy()` para cada página, con un `Suspense` que muestra `Spinner`.
- El pre-cableado se hace en Foundation para evitar conflictos posteriores en archivos centrales.
