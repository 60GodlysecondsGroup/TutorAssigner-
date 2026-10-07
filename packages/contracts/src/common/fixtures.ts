import type { ApiErrorBody, Page } from './index';

export const idValido = '6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d';

export const paginaValida: Page<{ id: string }> = {
  data: [{ id: idValido }],
  meta: { page: 1, pageSize: 20, total: 1 },
};

export const errorValidacion: ApiErrorBody = {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'La solicitud tiene datos inválidos',
    details: [{ path: 'email', message: 'Correo inválido' }],
    requestId: 'b7d2c1a0-0000-4000-8000-000000000001',
  },
};

export const errorNoAutenticado: ApiErrorBody = {
  error: {
    code: 'UNAUTHENTICATED',
    message: 'Se requiere iniciar sesión',
    requestId: 'b7d2c1a0-0000-4000-8000-000000000002',
  },
};

/** Fixtures inválidos: cada uno debe ser rechazado por su esquema. */
export const invalidos = {
  pagina: { data: [], meta: { page: 0, pageSize: 500, total: -1 } },
  error: { error: { code: 'minusculas', message: 'x' } },
  paginacionQuery: { page: '0', pageSize: '101' },
};
