# syntax=docker/dockerfile:1
# Build context is the repo root (see infra/docker/compose.*.yml).

# ---- deps: install the whole workspace once, cached on manifests only ----
FROM oven/bun:1.4.4-debian AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

# ---- dev: source is bind-mounted by compose.dev.yml, bun --watch reloads ----
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 4000
CMD ["bun", "run", "api:dev"]

# ---- build: bundle API + migration runner into apps/api/dist ----
FROM deps AS build
COPY apps/api apps/api
RUN bun run api:build

# ---- production: bundled output has no runtime node_modules ----
FROM oven/bun:1.4.4-debian AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=bun:bun /app/apps/api/dist ./dist
COPY --from=build --chown=bun:bun /app/apps/api/drizzle ./drizzle
USER bun
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrations: run `bun dist/migrate.js` as a one-shot (the `migrate` compose service).
CMD ["bun", "dist/index.js"]
