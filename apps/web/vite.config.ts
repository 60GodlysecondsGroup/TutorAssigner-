/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// En Docker, Vite escucha en 0.0.0.0:5173 y reenvía /api al servicio `api` (sin CORS en desarrollo).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, '../..', ''), ...process.env };
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],
    envDir: '../..',
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // `web` es el nombre del servicio en la red de Compose (lo usa el contenedor E2E).
      allowedHosts: ['web'],
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: false, xfwd: true },
      },
      watch: env.WATCH_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
    preview: { host: '0.0.0.0', port: 4173 },
    build: { outDir: 'dist', sourcemap: true },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  };
});
