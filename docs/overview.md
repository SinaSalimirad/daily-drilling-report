# Overview

Daily Drilling Report is an internal web app for drilling-fluid (mud) engineers. It stores
the master data of a drilling campaign and the daily report written on the rig:

| Entity    | What it is                                                                     | Belongs to       |
| --------- | ------------------------------------------------------------------------------ | ---------------- |
| Project   | A campaign: field, rig, operators, contractors, currency                       | –                |
| Well      | One well drilled in a project                                                  | Project          |
| Section   | A hole section of a well, in drilling order (`sequence`)                       | Well             |
| Report    | The daily drilling report of one day: depths, mud type, status, reporters      | Well + Section   |
| Product   | A mud product (name, size, unit, origin, SG)                                   | –                |
| Inventory | Stock of one product in one report: initial, received, used, returned, `final` | Report + Product |

Every entity has full CRUD in the API and a dashboard page in the web app.

Other documents: [folder-structure.md](folder-structure.md), [error-flow.md](error-flow.md),
[logging.md](logging.md), [authentication.md](authentication.md), [roadmap.md](roadmap.md).

## Architecture

```
                    Browser
                       │  http(s)
                       ▼
                 ┌───────────┐
                 │   nginx   │  single public entry point (infra/nginx)
                 └─────┬─────┘
          /api/*       │        everything else
        ┌──────────────┴──────────────┐
        ▼                             ▼
 ┌─────────────┐               ┌─────────────┐
 │  api :4000  │               │  web :3000  │
 │ Bun+Elysia  │               │ Bun+Next.js │
 │  + Drizzle  │               │ Query/Table │
 └──────┬──────┘               │ /Form+axios │
        │ SQL                  └─────────────┘
        ▼
 ┌─────────────┐
 │  Postgres   │  private network only
 └─────────────┘
```

| Component  | Tech                                                                       | Responsibility                                                                                                 |
| ---------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/web` | Bun, Next.js (App Router), TanStack Query / Table / Form, shadcn/ui, axios | Pages, forms, tables. Talks to the API only.                                                                   |
| `apps/api` | Bun, Elysia, Drizzle ORM, zod, OpenAPI                                     | Versioned HTTP API under `/api/v1`, validation, business rules, **owns the database** (schema and migrations). |
| `postgres` | PostgreSQL 18                                                              | Persistent data, reachable only from `api`.                                                                    |
| `nginx`    | nginx                                                                      | Routes `/api/*` to api and the rest to web. Prod config adds security headers, gzip and a request-rate limit.  |

### Key decisions

1. **The database lives inside `apps/api`.** Only the API talks to Postgres, so the schema,
   migrations and Drizzle config sit next to the code that uses them. There is no `packages/`
   folder; add one only when code is genuinely shared by both apps.
2. **Same origin through nginx.** The browser calls the relative path `/api`, so no CORS is needed
   in the deployed stack. `CORS_ORIGINS` exists only for running web and api on separate ports
   during development.
3. **Feature folders.** Everything for one entity (table, routes, service, UI, hooks, tests) lives
   in `features/<name>/` in each app. See [folder-structure.md](folder-structure.md).
4. **Validation lives in one place per feature.** The API's `*.schema.ts` defines the Drizzle
   table and derives the zod insert/update schemas from it; Elysia validates request bodies with
   those schemas. The web form repeats the rules only for instant feedback.
5. **Business rules are enforced by the database where possible**: unique names, "section
   belongs to the same well as the report" (composite foreign key), "width and height together",
   positive depths. The API turns constraint errors into client errors
   (see [error-flow.md](error-flow.md)).
6. **Lists are small, so filtering, sorting and paging run in the browser.** Every `GET /v1/<x>`
   returns all rows, joined with the names the table needs (project name on a well, well and
   section names on a report, and so on).

### Request flow (list wells)

1. The wells page renders; `useWells()` runs `GET /api/v1/wells` through the axios instance.
2. nginx matches `/api` and proxies to `api:4000`.
3. Elysia route → `wells.service.list()` → Drizzle query with an inner join on projects → Postgres.
4. JSON returns the same way; TanStack Query caches it for 30 seconds and TanStack Table renders it.
5. A write (`POST`, `PATCH`, `DELETE`) invalidates the feature's query key, so the table refetches.

## API

- Base path `/api/v1`. OpenAPI UI at `/api/openapi` (generated from the zod schemas).
- Each feature exposes `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`.
  Child lists accept a filter: `GET /wells?projectId=`, `/sections?wellId=`,
  `/reports?wellId=&sectionId=`, `/inventories?reportId=`.
- `PATCH` is a partial update: only the fields sent are changed. Parent ids (`projectId`,
  `wellId`, `reportId`, `productId`) are not editable; create a new row instead.
- Rate limits per client IP (`RATE_LIMIT_*`): a global one for every route and a stricter one for
  writes.

## Running it

### Locally, without Docker

```bash
cp .env.example .env            # set POSTGRES_PASSWORD and DATABASE_URL
bun install
bun run db:up                   # Postgres only, in a container (podman compose works too)
bun run db:migrate              # apply apps/api/drizzle/*.sql
bun run db:seed                 # optional dummy projects and wells
ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='...' bun run db:create-admin   # first login
bun run dev                     # api on :4000, web on :3000
```

The web app reads `NEXT_PUBLIC_API_URL` at build time and falls back to
`http://localhost:4000/api`, which is what this setup needs. The API must then allow the web
origin: `CORS_ORIGINS=http://localhost:3000`.

### Full stack behind nginx

```bash
bun run stack:up                # builds both images, starts nginx + web + api + postgres
```

Open `http://localhost:8080`. The web image is built with `NEXT_PUBLIC_API_URL=/api`, so the
browser talks to nginx only. Rebuild after code changes; this stack has no hot reload.
Run migrations against the container database with `bun run db:migrate` from the host.

### Environment variables

`.env.example` is the source of truth. Never commit `.env`.

| Variable                                                                                                           | Used by             | Notes                                                                               |
| ------------------------------------------------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST_PORT`                                          | postgres, compose   | compose builds the API's `DATABASE_URL` from these                                  |
| `DATABASE_URL`                                                                                                     | api                 | required when the API runs outside Docker                                           |
| `PORT`                                                                                                             | api                 | default 4000                                                                        |
| `CORS_ORIGINS`                                                                                                     | api                 | comma-separated http(s) origins; empty = no CORS headers (right behind nginx)       |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WRITE_MAX`, `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_REFRESH_MAX`, `RATE_LIMIT_WINDOW_MS` | api                 | requests per client IP per window                                                   |
| `JWT_SECRET`                                                                                                       | api, compose        | **required**, at least 32 characters; signs the access tokens                       |
| `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`, `SESSION_MAX_AGE_DAYS`                                       | api                 | access token / each refresh token / whole session after login (15 min / 7 d / 30 d) |
| `REFRESH_REUSE_GRACE_SECONDS`                                                                                      | api                 | a used refresh token sent again within this is a tab race, later it is theft (10 s) |
| `TEST_DATABASE_URL`                                                                                                | api tests           | enables the database tests; database name must end in `_test`                       |
| `NEXT_PUBLIC_API_URL`                                                                                              | web, **build time** | `/api` in the Docker image; `http://localhost:4000/api` when running directly       |
| `NGINX_PORT`                                                                                                       | compose             | host port of nginx, default 8080                                                    |

## Everyday commands

| Command                               | What it does                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `bun run typecheck` / `lint` / `test` | Same checks CI runs (Biome for lint and format). The API's database tests run only with `TEST_DATABASE_URL` set |
| `bun run db:create-admin`             | Creates an admin from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME`                                     |
| `bun run build`                       | `bun build` for the API, `next build` for the web                                                               |
| `bun run db:generate`                 | After editing a `*.schema.ts`: writes a new SQL migration to `apps/api/drizzle/`; commit it                     |
| `bun run db:studio`                   | Drizzle Studio against `DATABASE_URL`                                                                           |

## Database changes

1. Edit the table in `apps/api/src/features/<name>/<name>.schema.ts` (new tables must also be
   exported from `apps/api/src/db/schema.ts`).
2. `bun run db:generate`, read the SQL, commit it together with the code.
3. Migrations are applied as a separate step (`bun run db:migrate`), never by the API process.
   Keep them backwards compatible (add before you remove) so the previous image still runs.

## Git and CI

- Two long-lived branches: `main` (production-ready) and `development` (integration). Work on
  short branches (`feat/…`, `fix/…`, `chore/…`, `docs/…`) and open a PR into `development`;
  release by PR `development` → `main` and a `vX.Y.Z` tag.
- Commit messages and PR titles follow Conventional Commits: `type(scope): summary`.
- GitHub Actions (`.github/workflows/`): `ci.yml` (typecheck, tests and build of both apps),
  `lint.yml` (Biome), `secret-scan.yml` (gitleaks), plus Dependabot. Image build and deploy
  workflows are not written yet; see [roadmap.md](roadmap.md).
