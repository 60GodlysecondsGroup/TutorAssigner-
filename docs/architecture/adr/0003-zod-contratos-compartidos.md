# ADR-0003 · Zod como fuente única de contratos

- **Estado:** Aceptado (F1) · **Fecha:** 2026-10-07 · **Dueño:** Dev 1 (`common`, `auth`); cada dueño su carpeta

## Decisión

- `packages/contracts/src/<modulo>/index.ts` define los esquemas Zod; `fixtures.ts`, un fixture válido
  y uno inválido por esquema. El mismo esquema valida en Express (`validate`), en formularios React
  (`zodResolver`), genera los tipos y verifica respuestas en los tests de contrato.
- Importación por subruta (`@tutorias/contracts/<modulo>`, `@tutorias/contracts/<modulo>/fixtures`)
  mediante `exports` con comodines: no hay un `index.ts` central ni hay que editar `package.json`
  para agregar un módulo.
- El paquete se publica como TypeScript fuente; Vite, `tsx` y el bundle de `tsup` lo compilan.
- Formato común: `{ data }`, `{ data, meta }`, `{ error: { code, message, details?, requestId } }`.

## Consecuencias

- Cambios que rompen el contrato requieren etiqueta `contrato` y aprobación de los consumidores.
