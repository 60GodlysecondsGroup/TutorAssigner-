/**
 * Cliente HTTP único del navegador (dueño: Dev 5 · F3).
 *
 * Versión mínima creada en el bootstrap por Dev 1 porque la feature `auth` (F9) la necesita.
 * Implementa el contrato de la sección 8 del plan: base `/api/v1`, envía la cookie de sesión,
 * desenvuelve `{ data }` y convierte `{ error }` en `ApiError(code, message, details, status)`.
 * Un 401 avisa a los suscriptores de `onUnauthorized` (la sesión expiró → /login).
 * Dev 5 puede ampliarlo (reintentos, toasts, etc.) sin cambiar esta interfaz.
 */
import { ApiErrorBody, type ErrorDetail, type PageMeta } from '@tutorias/contracts/common';

export const API_BASE = '/api/v1';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ErrorDetail[];
  readonly requestId?: string;

  constructor(
    code: string,
    message: string,
    details: ErrorDetail[],
    status: number,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Suscribe una función a los 401 de cualquier petición. Devuelve la función para desuscribir. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /** No notificar el 401 (p. ej. credenciales inválidas en el login o `me` al arrancar). */
  skipUnauthorizedHandler?: boolean;
};

async function send(path: string, options: RequestOptions): Promise<unknown> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('NETWORK_ERROR', 'No se pudo conectar con el servidor', [], 0);
  }

  if (response.status === 204) return undefined;
  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = ApiErrorBody.safeParse(payload);
    const error = parsed.success
      ? new ApiError(
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.details ?? [],
          response.status,
          parsed.data.error.requestId,
        )
      : new ApiError('INTERNAL_ERROR', 'Respuesta inesperada del servidor', [], response.status);
    if (response.status === 401 && !options.skipUnauthorizedHandler) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw error;
  }
  return payload;
}

/** Petición que devuelve `data` del sobre `{ data }` (o `undefined` en 204). */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = (await send(path, options)) as { data: T } | undefined;
  return payload?.data as T;
}

/** Petición paginada: devuelve el sobre completo `{ data, meta }`. */
export async function requestPage<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T[]; meta: PageMeta }> {
  return (await send(path, options)) as { data: T[]; meta: PageMeta };
}
