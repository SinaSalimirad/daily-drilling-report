FROM oven/bun:1.4.4-debian AS builder

WORKDIR /app

COPY package.json bun.lock .npmrc ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN bun install --frozen-lockfile

# Copy Frontend source code
COPY apps/web ./apps/web

# NEXT_PUBLIC_* values are inlined into the browser bundle at build time.
# Behind nginx the browser calls the API on the same origin, so the default is
# the relative path `/api`. Override with `--build-arg NEXT_PUBLIC_API_URL=...`.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run web:build

FROM oven/bun:1.4.4-debian AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=bun:bun /app/apps/web/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=bun:bun /app/apps/web/public ./apps/web/public

USER bun

EXPOSE 3000/tcp

CMD ["bun", "apps/web/server.js"]
