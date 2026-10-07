/**
 * Arranque del API: valida la configuración, abre la base, escucha y cierra limpio con SIGTERM.
 * Si la configuración es inválida (p. ej. falta JWT_SECRET en producción) el proceso termina.
 */
import { createApp } from './app';
import { ConfigError, loadConfig } from './platform/config';
import { createDb } from './platform/db';
import { createLogger } from './platform/logger';

function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(err instanceof ConfigError ? err.message : err);
    process.exit(1);
  }

  const logger = createLogger(config);
  const db = createDb(config.databaseUrl, logger);
  const app = createApp({ config, db, logger });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'API escuchando');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Cerrando API');
    server.close(() => {
      db.destroy().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
