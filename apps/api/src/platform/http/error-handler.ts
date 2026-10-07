/**
 * Traduce cualquier error al sobre estándar. Tabla (sección 9 del plan):
 *   ZodError            → 400 VALIDATION_ERROR con details[].path
 *   AppError            → su estado y código
 *   PostgreSQL 23505    → 409 CONFLICT
 *   PostgreSQL 23503    → 409 REFERENCE_CONFLICT
 *   JSON mal formado    → 400 VALIDATION_ERROR
 *   Cuerpo demasiado grande → 413 PAYLOAD_TOO_LARGE
 *   Cualquier otro      → 500 INTERNAL_ERROR, sin stack hacia el cliente
 * Toda respuesta lleva `requestId`, el mismo que aparece en el log.
 */
import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorBody, ErrorDetail } from '@tutorias/contracts/common';
import type { Logger } from '../logger';
import { AppError } from './app-error';

type Normalized = { status: number; code: string; message: string; details?: ErrorDetail[] };

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

export function zodIssuesToDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

function normalize(err: unknown): Normalized {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'La solicitud tiene datos inválidos',
      details: zodIssuesToDetails(err),
    };
  }
  if (isRecord(err)) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      return { status: 409, code: 'CONFLICT', message: 'Ya existe un registro con esos datos' };
    }
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      return {
        status: 409,
        code: 'REFERENCE_CONFLICT',
        message: 'El registro referencia o es referenciado por otro que no lo permite',
      };
    }
    // Errores de body-parser (express.json)
    if (err.type === 'entity.too.large') {
      return {
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'El cuerpo de la petición es demasiado grande',
      };
    }
    if (err.type === 'entity.parse.failed') {
      return { status: 400, code: 'VALIDATION_ERROR', message: 'El cuerpo no es un JSON válido' };
    }
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Error interno del servidor' };
}

export function sendError(req: Request, res: Response, e: Normalized) {
  const body: ApiErrorBody = {
    error: {
      code: e.code,
      message: e.message,
      ...(e.details && e.details.length > 0 ? { details: e.details } : {}),
      requestId: String(req.id),
    },
  };
  res.status(e.status).json(body);
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);
    const normalized = normalize(err);
    const log = req.log ?? logger;
    if (normalized.status >= 500) {
      log.error({ err, requestId: req.id }, 'Error no controlado');
    } else {
      log.debug({ code: normalized.code, requestId: req.id }, 'Error de cliente');
    }
    sendError(req, res, normalized);
  };
}

/** 404 para rutas inexistentes, con el mismo sobre. */
export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(req, res, {
    status: 404,
    code: 'NOT_FOUND',
    message: `No existe ${req.method} ${req.originalUrl.split('?')[0]}`,
  });
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
