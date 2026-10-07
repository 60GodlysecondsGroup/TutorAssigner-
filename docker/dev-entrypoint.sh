#!/bin/sh
# Entrypoint de desarrollo. Si SYNC_DEPS=true (solo el servicio `migrate`, que corre primero) y el
# package-lock.json cambió desde la última instalación, sincroniza node_modules (volúmenes
# compartidos) sin tener que borrar volúmenes ni reconstruir la imagen.
set -e

if [ "${SYNC_DEPS:-false}" = "true" ] && [ -f package-lock.json ]; then
  current="$(sha256sum package-lock.json | cut -d' ' -f1)"
  installed="$(cat node_modules/.package-lock.hash 2>/dev/null || true)"
  if [ "$current" != "$installed" ]; then
    echo "[deps] package-lock.json cambió: sincronizando dependencias…"
    npm install --no-audit --no-fund
    echo "$current" > node_modules/.package-lock.hash
  fi
fi

exec "$@"
