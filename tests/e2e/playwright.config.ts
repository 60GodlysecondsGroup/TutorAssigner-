import { defineConfig, devices } from '@playwright/test';

// Infra E2E (Dev 1). Los flujos completos los escriben Dev 5 y los dueños de cada feature.
// Se ejecuta con: docker compose --profile e2e run --rm e2e  (con el stack ya levantado).
export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
