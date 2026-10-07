## Qué cambia

<!-- Un propósito por PR. Título: `tipo(modulo): resumen`, p. ej. `feat(tutores): reemplazo de franjas`. -->

## ¿Toca un contrato?

- [ ] No
- [ ] Sí, cambio aditivo (campo opcional nuevo) — revisa el consumidor
- [ ] Sí, cambio que rompe (quita/renombra/cambia tipo) — etiqueta `contrato`, aprobación de todos los consumidores y fixtures actualizados en este PR

## ¿Toca archivos sensibles?

<!-- package.json/lockfile raíz, compose*.yaml, docker/, apps/api/src/app.ts, apps/web/src/app/, src/mocks/, contracts/src/common, tsconfig.base.json, eslint.config.js, .env.example, CI. Máximo uno por PR. -->

- [ ] No
- [ ] Sí: <!-- cuál -->

## Cómo probarlo

```bash
docker compose up
```

<!-- Pasos y tests relevantes. -->

## Capturas (si hay UI)

## Checklist

- [ ] Solo toca carpetas de mi ownership (o lo indico arriba)
- [ ] Tests unitarios / integración / contrato en verde
- [ ] Sin datos personales, contraseñas ni tokens en logs o fixtures
- [ ] Migraciones nuevas (si hay) con `down` y sin editar migraciones ya mergeadas
