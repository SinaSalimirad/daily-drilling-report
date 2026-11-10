# Infrastructure

All infra files live in `infra/`.

```
infra/
├── docker/
│   ├── compose.dev.yml     # full local stack, hot reload
│   └── compose.prod.yml    # staging/production, pulls images from GHCR
└── nginx/
    ├── nginx.dev.conf
    └── nginx.prod.conf
```

## Services

| Service | Dev | Prod |
| --- | --- | --- |
| nginx | `localhost:8080` | port 80 |
| web | Next dev server, source mounted | Next standalone image |
| api | `bun --watch`, source mounted | bundled image from GHCR |
| migrate | one-shot, runs before api | one-shot, runs before api |
| postgres | published on `127.0.0.1:5432` | **not published**, internal network only |

## Dockerfiles

Both `apps/api/Dockerfile` and `apps/web/Dockerfile` are multi-stage, built from the **repo root** as context:

`deps` (install workspace, cached on manifests) → `dev` (used by compose.dev) → `build` → `production` (small runtime image, non-root `bun` user, healthcheck).

Build with `--target production` (or `dev`).

## Local development

```bash
cp .env.example .env          # fill in values
bun install
bun run stack:up              # build + start everything behind nginx
bun run db:generate           # after changing a *.table.ts
```

Open `http://localhost:8080`. Stop with `bun run stack:down`.

## nginx

- `/api` and `/api/...` → `api:4000`; everything else → `web:3000`.
- `proxy_pass` uses variables so containers can be recreated without a 502; this **requires** `resolver 127.0.0.11` (Docker DNS). Both configs set it.
- `GET /healthz` returns `200 ok` for container health checks.
- Prod only: security headers, gzip, `limit_req` on `/api` (20 req/s, burst 40), `server_tokens off`.
- TLS is not terminated by these configs. Terminate TLS in front (cloud load balancer, Cloudflare, or Caddy/certbot on the host) and keep `X-Forwarded-Proto` correct. If nginx sits behind another proxy, configure `set_real_ip_from` + `real_ip_header` or the rate limit will treat all users as one IP.

## Environment variables

`.env.example` is the source of truth. Never commit `.env`.

| Variable | Used by | Notes |
| --- | --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | postgres, compose | compose builds `DATABASE_URL` from these |
| `DATABASE_URL` | api | required; only needed in `.env` when running the API outside Docker |
| `PORT` | api | default 4000 |
| `CORS_ORIGINS` | api | comma-separated; empty = no CORS (fine behind nginx) |
| `NEXT_PUBLIC_API_URL` | web (build time) | default `/api` |
| `NGINX_PORT`, `POSTGRES_HOST_PORT` | compose | host port overrides |
| `IMAGE_REPO`, `IMAGE_TAG` | compose.prod | set by the deploy workflow |

## Production server requirements

Docker + Compose plugin, a `.env` file in the deploy directory (owner-only permissions), and an SSH user the deploy workflow can use. See [ci-cd.md](ci-cd.md) for secrets.

## Database migrations

- Generated with `drizzle-kit generate`, committed under `apps/api/drizzle/`.
- Applied by the `migrate` service on every `compose up`, before `api` starts. If a migration fails, `api` does not start and the old containers keep running.
- Make migrations backwards compatible (add columns before using them, remove in a later release) so a rollback to the previous image still works.

## Backups and rollback

- Rollback app: redeploy a previous `IMAGE_TAG` (`sha-<commit>`).
- Back up Postgres on a schedule (`pg_dump` to off-server storage) and test restores. The `postgres_data` volume is the only stateful piece.
