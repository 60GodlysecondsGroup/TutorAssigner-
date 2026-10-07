# ADR-0001 · Monolito modular

- **Estado:** Aceptado (Foundation, F0) · **Fecha:** 2026-10-07 · **Dueño:** Dev 1

## Contexto

Dominio pequeño (cuatro capacidades confirmadas), 5 desarrolladores y 5 LLMs trabajando en paralelo.
El riesgo principal es el exceso de coordinación, no la escala.

## Decisión

- Un único API Express dividido en módulos (`apps/api/src/modules/<modulo>`) con dueño, tablas,
  prefijo de URL y carpeta propios. La única puerta de entrada de un módulo es su `index.ts`
  (`create<Modulo>Module(deps) → { router, api }`).
- Capas: rutas → controlador → servicio → repositorio. El motor de matching vive fuera del API como
  librería pura (`packages/matching`).
- Composición manual de dependencias en `app.ts`, con todos los módulos pre-registrados desde
  Foundation (stubs 501) para que nadie vuelva a tocar el archivo central.
- Dependencias en una sola dirección: Recomendaciones → Tutores, Solicitudes, Motor.
- Sin microservicios, colas ni bus de eventos en el MVP.

## Consecuencias

- ESLint hace cumplir las fronteras (`no-restricted-imports`): un módulo o feature solo importa el
  `index.ts` de otro; `packages/matching` y `packages/contracts` no importan Express, Knex ni React.
- Un único despliegue y una única base. Si el dominio crece, un módulo se puede extraer porque su
  frontera ya es explícita.
