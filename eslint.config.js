// ESLint del monorepo (Dev 1, archivo sensible). Incluye las reglas de fronteras de la sección 6:
// - un módulo del API solo importa de otro módulo su `index.ts`;
// - una feature web solo importa de otra feature su `index.ts`;
// - `packages/matching` y `packages/contracts` no importan Express, Knex, pg ni React.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Prohíbe importar archivos internos de un módulo hermano a la profundidad `depth`. */
function soloIndexDeHermanos(depth, mensaje) {
  const up = '\\.\\./'.repeat(depth);
  return {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: `^${up}(?!\\.\\.|platform/|shared/|app/)[^/]+/(?!index(\\.tsx?)?$).+$`,
            message: mensaje,
          },
        ],
      },
    ],
  };
}

const MSG_API = 'Un módulo solo puede importar de otro su index.ts (API pública).';
const MSG_WEB = 'Una feature solo puede importar de otra su index.ts.';
const INFRA = ['express', 'knex', 'pg', 'pino', 'pino-http', 'bcrypt', 'jsonwebtoken'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
      'apps/web/public/mockServiceWorker.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    },
  },

  // ── API: fronteras entre módulos ─────────────────────────────────────────
  { files: ['apps/api/src/modules/*/*.ts'], rules: soloIndexDeHermanos(1, MSG_API) },
  { files: ['apps/api/src/modules/*/*/*.ts'], rules: soloIndexDeHermanos(2, MSG_API) },

  // ── Web ──────────────────────────────────────────────────────────────────
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  { files: ['apps/web/src/features/*/*.{ts,tsx}'], rules: soloIndexDeHermanos(1, MSG_WEB) },
  { files: ['apps/web/src/features/*/*/*.{ts,tsx}'], rules: soloIndexDeHermanos(2, MSG_WEB) },

  // ── Paquetes puros ───────────────────────────────────────────────────────
  {
    files: ['packages/matching/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: INFRA.map((name) => ({
            name,
            message: 'El motor es puro: sin Express, Knex ni I/O.',
          })),
          patterns: [
            {
              group: ['**/apps/**', 'react', 'react-*'],
              message: 'El motor no depende de apps ni de UI.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/contracts/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: INFRA.map((name) => ({ name, message: 'Los contratos solo usan Zod.' })),
          patterns: [
            { group: ['**/apps/**', 'react', 'react-*'], message: 'Los contratos solo usan Zod.' },
          ],
        },
      ],
    },
  },
);
