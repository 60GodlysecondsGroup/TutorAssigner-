/**
 * @tutorias/contracts/common — sobre de respuesta, errores, paginación e ids.
 * Dueño: Dev 1 (cambios con aprobación de al menos un consumidor).
 *
 * Formato:
 *   Ok<T>    = { data: T }
 *   Page<T>  = { data: T[]; meta: { page, pageSize, total } }
 *   ApiError = { error: { code, message, details?, requestId } }
 * Ids: UUID. Fechas: ISO 8601 en UTC. Paginación: ?page=1&pageSize=20 (máx. 100).
 */
import { z } from 'zod';

// ── Ids y fechas ─────────────────────────────────────────────────────────────

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

/** Parámetro de ruta `:id`. */
export const IdParams = z.object({ id: Id });
export type IdParams = z.infer<typeof IdParams>;

/** Fecha-hora ISO 8601 en UTC (`2026-10-07T14:00:00.000Z`). */
export const IsoDateTime = z.iso.datetime();
export type IsoDateTime = z.infer<typeof IsoDateTime>;

// ── Paginación ───────────────────────────────────────────────────────────────

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

/** Query de paginación; acepta strings (query string) y aplica defaults. */
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export const PageMeta = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(PAGE_SIZE_MAX),
  total: z.number().int().min(0),
});
export type PageMeta = z.infer<typeof PageMeta>;

// ── Sobres de respuesta ──────────────────────────────────────────────────────

export const okEnvelope = <T extends z.ZodType>(data: T) => z.object({ data });
export const pageEnvelope = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), meta: PageMeta });

export type Ok<T> = { data: T };
export type Page<T> = { data: T[]; meta: PageMeta };

// ── Errores ──────────────────────────────────────────────────────────────────

/**
 * Códigos transversales. Cada módulo define además los suyos
 * (`<MODULO>_NOT_FOUND` y reglas de estado) en su propio contrato.
 */
export const CommonErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  REFERENCE_CONFLICT: 'REFERENCE_CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type CommonErrorCode = (typeof CommonErrorCode)[keyof typeof CommonErrorCode];

/** Estado HTTP de cada código transversal. */
export const COMMON_ERROR_STATUS: Record<CommonErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  REFERENCE_CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/** Código de error: MAYÚSCULAS_CON_GUION_BAJO. */
export const ErrorCode = z.string().regex(/^[A-Z][A-Z0-9_]*$/);

export const ErrorDetail = z.object({
  /** Ruta del campo con puntos (`franjas.0.inicio`); vacío si aplica a todo el cuerpo. */
  path: z.string(),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof ErrorDetail>;

export const ApiErrorBody = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.array(ErrorDetail).optional(),
    requestId: z.string().min(1),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

// ── Health ───────────────────────────────────────────────────────────────────

export const HealthStatus = z.object({
  status: z.enum(['ok', 'error']),
  checks: z.record(z.string(), z.enum(['ok', 'error'])).optional(),
});
export type HealthStatus = z.infer<typeof HealthStatus>;
