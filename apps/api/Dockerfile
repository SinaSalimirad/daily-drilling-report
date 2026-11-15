# syntax=docker/dockerfile:1
# Build context: repository root (docker-compose.yml).

FROM oven/bun:1.4.4-slim AS deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/calc/package.json packages/calc/
COPY packages/schemas/package.json packages/schemas/
RUN bun install --frozen-lockfile --filter '@ddr/api'

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN bun run --cwd apps/api build

FROM oven/bun:1.4.4-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=bun:bun /repo/apps/api/dist ./dist
USER bun
EXPOSE 3001
CMD ["bun", "dist/index.js"]
