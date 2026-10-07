# Registro de decisiones (ADR)

Cada ADR fija una decisión con su contexto y consecuencias. Uno nuevo por decisión; uno aceptado no
se edita: se reemplaza con otro que lo declare «Sustituido por ADR-NNNN».

| ADR                                         | Decisión                                                                          | Estado   |
| ------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| [0001](0001-monolito-modular.md)            | Monolito modular con módulos con dueño y motor puro                               | Aceptado |
| [0002](0002-knex-migraciones-por-modulo.md) | Knex con una migración por archivo y módulo (sin ORM de esquema único)            | Aceptado |
| [0003](0003-zod-contratos-compartidos.md)   | Zod en `packages/contracts` como fuente única de contratos, importado por subruta | Aceptado |
| [0004](0004-sesion-jwt-cookie-httponly.md)  | Sesión con JWT en cookie httpOnly, stateless, datos mínimos                       | Aceptado |
| [0005](0005-docker-multicontenedor.md)      | Docker Compose multicontenedor y una imagen multietapa                            | Aceptado |
| [0006](0006-typescript-y-versiones.md)      | TypeScript (PV-12) y versiones fijadas                                            | Aceptado |
