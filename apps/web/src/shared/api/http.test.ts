import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError, onUnauthorized, request, requestPage } from './http';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const errorBody = (code: string) => ({
  error: { code, message: `msg ${code}`, requestId: 'req-1' },
});

describe('cliente HTTP', () => {
  it('desenvuelve { data } y devuelve { data, meta } en páginas', async () => {
    server.use(
      http.get('/api/v1/uno', () => HttpResponse.json({ data: { id: 1 } })),
      http.get('/api/v1/lista', ({ request: req }) =>
        HttpResponse.json({
          data: [new URL(req.url).searchParams.get('page')],
          meta: { page: 2, pageSize: 20, total: 21 },
        }),
      ),
    );
    await expect(request('/uno')).resolves.toEqual({ id: 1 });
    await expect(requestPage('/lista', { query: { page: 2, q: undefined } })).resolves.toEqual({
      data: ['2'],
      meta: { page: 2, pageSize: 20, total: 21 },
    });
  });

  it.each([
    [400, 'VALIDATION_ERROR'],
    [401, 'UNAUTHENTICATED'],
    [404, 'TUTOR_NOT_FOUND'],
    [409, 'CONFLICT'],
    [500, 'INTERNAL_ERROR'],
  ])('%i → ApiError con código %s', async (status, code) => {
    server.use(http.get('/api/v1/err', () => HttpResponse.json(errorBody(code), { status })));
    const err = await request('/err', { skipUnauthorizedHandler: true }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status, code, requestId: 'req-1' });
  });

  it('respuesta de error sin sobre → ApiError genérico', async () => {
    server.use(http.get('/api/v1/raro', () => new HttpResponse('<html>', { status: 502 })));
    await expect(request('/raro')).rejects.toMatchObject({ status: 502, code: 'INTERNAL_ERROR' });
  });

  it('401 notifica a los suscriptores salvo que se pida lo contrario', async () => {
    server.use(
      http.get('/api/v1/privado', () =>
        HttpResponse.json(errorBody('UNAUTHENTICATED'), { status: 401 }),
      ),
    );
    const listener = vi.fn();
    const off = onUnauthorized(listener);
    await request('/privado').catch(() => undefined);
    await request('/privado', { skipUnauthorizedHandler: true }).catch(() => undefined);
    off();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('204 devuelve undefined y envía JSON en el cuerpo', async () => {
    let recibido: unknown;
    server.use(
      http.post('/api/v1/accion', async ({ request: req }) => {
        recibido = await req.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(request('/accion', { method: 'POST', body: { a: 1 } })).resolves.toBeUndefined();
    expect(recibido).toEqual({ a: 1 });
  });
});
