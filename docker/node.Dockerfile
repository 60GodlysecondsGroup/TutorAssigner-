# syntax=docker/dockerfile:1.7
# Imagen única del monorepo (Dev 1). Etapas:
#   base → deps (npm ci) → dev (migrate, api y web en desarrollo; código por bind mount)
#                        → build (vite build + bundle del API) → prod (solo dependencias de producción,
#                          API compilado y frontend estático, usuario no root)
ARG NODE_VERSION=22.21.0

FROM node:${NODE_VERSION}-alpine AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
WORKDIR /app
RUN chown node:node /app

# ── Dependencias de todos los workspaces (una sola capa cacheable) ────────────
FROM base AS deps
USER node
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node apps/api/package.json apps/api/
COPY --chown=node:node apps/web/package.json apps/web/
COPY --chown=node:node packages/contracts/package.json packages/contracts/
COPY --chown=node:node packages/matching/package.json packages/matching/
COPY --chown=node:node database/package.json database/
# El hash permite al entrypoint de dev detectar cambios del lockfile. Los node_modules anidados se
# crean (como node) para que sus volúmenes de Compose no nazcan con dueño root.
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 \
    npm ci \
 && sha256sum package-lock.json | cut -d' ' -f1 > node_modules/.package-lock.hash \
 && mkdir -p apps/api/node_modules apps/web/node_modules packages/contracts/node_modules \
             packages/matching/node_modules database/node_modules

# ── Desarrollo: el código entra por bind mount; node_modules vive en volúmenes ─
FROM deps AS dev
ENV NODE_ENV=development
COPY --chown=node:node --chmod=755 docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/dev-entrypoint.sh"]
CMD ["npm", "run", "dev", "-w", "apps/api"]

# ── Build: frontend estático + bundle del API ─────────────────────────────────
FROM deps AS build
COPY --chown=node:node . .
RUN npm run build

# ── Dependencias de producción ────────────────────────────────────────────────
FROM base AS prod-deps
USER node
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node apps/api/package.json apps/api/
COPY --chown=node:node apps/web/package.json apps/web/
COPY --chown=node:node packages/contracts/package.json packages/contracts/
COPY --chown=node:node packages/matching/package.json packages/matching/
COPY --chown=node:node database/package.json database/
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 \
    npm ci --omit=dev

# ── Producción: Express sirve el API y el build de Vite ───────────────────────
FROM base AS prod
ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIST_DIR=/app/apps/web/dist
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node database ./database
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health/ready >/dev/null || exit 1
CMD ["node", "--enable-source-maps", "apps/api/dist/server.js"]
