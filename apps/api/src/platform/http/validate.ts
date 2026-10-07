/**
 * Validación de forma con los esquemas Zod de `@tutorias/contracts`, antes del controlador.
 * Reemplaza `req.body`, `req.query` y `req.params` por los valores ya parseados (con defaults y
 * coerciones aplicados). Un `ZodError` termina en 400 `VALIDATION_ERROR` con `details[].path`.
 * La validación de negocio (existe, está abierta, hay cupo) va en el servicio.
 */
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export type ValidationSchemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    if (schemas.query) {
      // En Express 5 `req.query` es un getter: se sombrea con una propiedad propia.
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  };
}
