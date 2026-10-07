# ADR-0002 · Knex y migraciones por módulo

- **Estado:** Aceptado (F0/F2) · **Fecha:** 2026-10-07 · **Dueño:** Dev 1

## Contexto

Un ORM con esquema único (p. ej. Prisma) concentra el modelo en un archivo que los 5 tocarían a la vez.

## Decisión

- Knex + `pg`, SQL explícito. Una migración por archivo: `AAAAMMDDHHMMSS_<modulo>_<cambio>.ts` en
  `database/migrations`, con dueño por patrón en CODEOWNERS (`*_tutores_*`, `*_auth_*`, …).
- Migraciones y seeds en TypeScript, ejecutados con `tsx` por un runner propio
  (`database/scripts/cli.ts`): `latest`, `rollback`, `rollback-all`, `status`, `seed`, `setup`, `make`.
- Seeds idempotentes en orden de nombre; los `10_*` en adelante son de demo y solo corren con
  `SEED_DEMO=true`.
- Convenciones comunes en `database/helpers.ts` (`uuidPrimaryKey`, `timestamps`, `addUpdatedAtTrigger`)
  y una migración de plataforma con la función `set_updated_at()`.
- `gen_random_uuid()` nativo (PostgreSQL ≥ 13); estados como `text` + `CHECK`, no `ENUM`.
- Locale de la base: proveedor `builtin` `C.UTF-8` de PostgreSQL 17, para que `lower()`/`ILIKE` se
  comporten igual en todos los entornos.

## Consecuencias

- Sin conflictos de merge en el esquema. Una migración mergeada no se edita.
- El CI aplica todas las migraciones desde cero, las revierte y las vuelve a aplicar.
- Dentro de vitest, Knex carga las migraciones con el loader nativo de Node; por eso el setup de los
  tests de integración invoca la CLI con `tsx` en un subproceso.
