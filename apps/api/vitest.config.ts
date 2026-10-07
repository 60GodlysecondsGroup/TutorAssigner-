import { defineConfig } from 'vitest/config';

// Tests unitarios: sin base de datos. Los de integración (`*.int.test.ts`) usan vitest.int.config.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['**/*.int.test.ts', '**/node_modules/**'],
    env: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
  },
});
