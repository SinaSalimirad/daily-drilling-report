# syntax=docker/dockerfile:1
# Build context: repository root (docker-compose.yml).
# Built with Bun, runs on Node LTS (docs/stack-decisions.md).

FROM oven/bun:1.4.4-slim AS deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/calc/package.json packages/calc/
COPY packages/schemas/package.json packages/schemas/
RUN bun install --frozen-lockfile

FROM deps AS build
# Inlined into the client bundle at build time; relative, so one image fits every environment.
ARG NEXT_PUBLIC_API_BASE=/api
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
COPY apps/web apps/web
RUN bun run --cwd apps/web build

FROM node:26.13.1-trixie-slim AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
# outputFileTracingRoot is the monorepo root, so the standalone folder mirrors the repository layout.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
