import { defineConfig } from 'tsup';

// Build de producción: un único bundle ESM. Los paquetes del monorepo (@tutorias/*) se
// incluyen en el bundle porque se publican como TypeScript; el resto queda en node_modules.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@tutorias\//],
});
