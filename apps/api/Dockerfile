FROM oven/bun:1.4.4-debian AS builder

WORKDIR /app

COPY package.json bun.lock .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

COPY apps/api apps/api

RUN bun run api:build

FROM oven/bun:1.4.4-debian AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build --chown=bun:bun /app/apps/api/dist ./dist

USER bun

EXPOSE 4000

CMD ["bun", "dist/index.js"]
