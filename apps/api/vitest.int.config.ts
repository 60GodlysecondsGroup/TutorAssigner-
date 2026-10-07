import { defineConfig } from 'vitest/config';

// Tests de integración contra PostgreSQL (DATABASE_URL_TEST). El setup global aplica las
// migraciones; los archivos corren en serie porque comparten la base de test.
export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts', 'test/**/*.int.test.ts'],
    globalSetup: ['test/helpers/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    env: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
  },
});
