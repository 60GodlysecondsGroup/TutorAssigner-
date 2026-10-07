/**
 * Logs JSON estructurados con pino. Nunca se registran cuerpos de petición, contraseñas,
 * hashes, tokens ni cookies: los campos sensibles se censuran aunque alguien los loguee por error.
 */
import { pino, type DestinationStream, type Logger } from 'pino';
import type { Config } from './config';

export type { Logger };

export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  'password_hash',
  'token',
  '*.password',
  '*.passwordHash',
  '*.password_hash',
  '*.token',
];

export function createLogger(
  config: Pick<Config, 'logLevel' | 'env'>,
  destination?: DestinationStream,
): Logger {
  return pino(
    {
      level: config.logLevel,
      base: { service: 'api', env: config.env },
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    destination,
  );
}
