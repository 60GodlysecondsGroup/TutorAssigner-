/**
 * Error de aplicación tipado. Los servicios lanzan `AppError`; el middleware de errores lo
 * traduce al sobre estándar `{ error: { code, message, details?, requestId } }`.
 * Cada módulo define sus códigos en `<modulo>.errors.ts` (p. ej. `TUTOR_NOT_FOUND`).
 */
import type { ErrorDetail } from '@tutorias/contracts/common';

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(code: string, status: number, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** 404 — `code` del módulo, p. ej. `TUTOR_NOT_FOUND`. */
  static notFound(code: string, message: string) {
    return new AppError(code, 404, message);
  }

  /** 409 — regla de estado (ya asignada, cancelada, obsoleta…). */
  static conflict(code: string, message: string, details?: ErrorDetail[]) {
    return new AppError(code, 409, message, details);
  }

  /** 422 — regla de negocio sobre datos con forma válida (materia inactiva, franjas solapadas…). */
  static unprocessable(code: string, message: string, details?: ErrorDetail[]) {
    return new AppError(code, 422, message, details);
  }

  static unauthenticated(message = 'Se requiere iniciar sesión') {
    return new AppError('UNAUTHENTICATED', 401, message);
  }

  static forbidden(message = 'No tienes permiso para esta acción') {
    return new AppError('FORBIDDEN', 403, message);
  }

  static notImplemented(message = 'Funcionalidad aún no implementada') {
    return new AppError('NOT_IMPLEMENTED', 501, message);
  }
}
