import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const VALID_INCOMING_ID = /^[A-Za-z0-9-]{8,100}$/;

/**
 * Asigna `req.id` (reutiliza `x-request-id` entrante si es seguro) y lo devuelve en la cabecera.
 * El mismo id aparece en los logs y en todo sobre de error.
 */
export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    const id = incoming && VALID_INCOMING_ID.test(incoming) ? incoming : randomUUID();
    req.id = id;
    res.setHeader('x-request-id', id);
    next();
  };
}
