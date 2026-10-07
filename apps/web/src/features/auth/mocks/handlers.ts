/**
 * Handlers MSW de auth con los fixtures del contrato. El agregador `src/mocks/handlers.ts`
 * (Dev 5) los importa; también los usan los tests de esta feature.
 * Credenciales mock: las de `loginValido` en `@tutorias/contracts/auth/fixtures`.
 */
import { http, HttpResponse } from 'msw';
import {
  errorCredenciales,
  loginValido,
  usuarioCoordinador,
} from '@tutorias/contracts/auth/fixtures';
import type { ApiErrorBody } from '@tutorias/contracts/common';

let sesionActiva = false;

/** Reinicia el estado del mock (útil entre tests). */
export function resetAuthMock(conSesion = false) {
  sesionActiva = conSesion;
}

const noAutenticado: ApiErrorBody = {
  error: { code: 'UNAUTHENTICATED', message: 'Se requiere iniciar sesión', requestId: 'mock' },
};

export const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === loginValido.email && body.password === loginValido.password) {
      sesionActiva = true;
      return HttpResponse.json({ data: usuarioCoordinador });
    }
    return HttpResponse.json(errorCredenciales, { status: 401 });
  }),

  http.post('/api/v1/auth/logout', () => {
    if (!sesionActiva) return HttpResponse.json(noAutenticado, { status: 401 });
    sesionActiva = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/v1/auth/me', () =>
    sesionActiva
      ? HttpResponse.json({ data: usuarioCoordinador })
      : HttpResponse.json(noAutenticado, { status: 401 }),
  ),
];
