#!/bin/sh
# Se ejecuta solo al inicializar un volumen vacío: crea la base de test junto a la de desarrollo.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE "${POSTGRES_DB}_test" OWNER "$POSTGRES_USER";
EOSQL
