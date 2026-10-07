# ADR-0006 · TypeScript y versiones fijadas

- **Estado:** Aceptado (F0, default de PV-12) · **Fecha:** 2026-10-07 · **Dueño:** Dev 1

## Decisión

- TypeScript estricto en todo el monorepo (`tsconfig.base.json`, `moduleResolution: Bundler`).
  Ejecución: `tsx` en desarrollo, migraciones y seeds; `tsup` empaqueta el API para producción; Vite
  compila la web.
- Versiones: Node 22 LTS (`.nvmrc`, imagen `node:22.21.0-alpine`), PostgreSQL 17 (`postgres:17-alpine`),
  React 19, Vite 7, Express 5, Zod 4, Knex 3, Vitest 3, ESLint 10, Playwright 1.63 (paquete e imagen).
  Se eligen majors estables y compatibles entre sí; subir una major es un PR propio.
- Las dependencias base de todos los workspaces se declararon en F0 para no pelear por el lockfile.
