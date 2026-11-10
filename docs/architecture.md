# Architecture (big picture)

```
                    Browser
                       │  http(s)
                       ▼
                 ┌───────────┐
                 │   nginx   │  single public entry point
                 └─────┬─────┘
          /api/*       │        everything else
        ┌──────────────┴──────────────┐
        ▼                             ▼
 ┌─────────────┐               ┌─────────────┐
 │  api :4000  │               │  web :3000  │
 │ Bun+Elysia  │               │ Bun+Next.js │
 │  + Drizzle  │               │ Table/Form  │
 └──────┬──────┘               │ + axios     │
        │ SQL                  └─────────────┘
        ▼
 ┌─────────────┐
 │  Postgres   │  private network only
 └─────────────┘
```

## Components

| Component | Tech | Responsibility |
| --- | --- | --- |
| `apps/web` | Bun, Next.js, TanStack Table + Form, axios | UI, forms, tables; talks to the API via `/api` |
| `apps/api` | Bun, Elysia, Drizzle ORM | HTTP API, business logic, **owns the database** (schema, migrations) |
| `postgres` | PostgreSQL | Persistent data, reachable only from `api` |
| `nginx` | nginx | Routes `/api/*` to api, the rest to web; security headers, gzip, rate limit (prod) |

## Key decisions

1. **Database lives inside `apps/api`**, not in a shared `packages/` folder. Only the API talks to Postgres, so schema, migrations and the Drizzle config sit next to the code that uses them.
2. **Same-origin through nginx.** The browser only knows `/api`, so there is no CORS in normal use and no API URL baked into the frontend.
3. **Feature-based folders** in both apps: everything for one feature (table, routes, service, UI, hooks) is in one folder. See [folder-structure.md](folder-structure.md).
4. **No `packages/` yet.** Add one only when code is genuinely shared by both apps (for example API types), not before.
5. **Migrations run as a one-shot step** before the API starts, never inside the API process.

## Request flow example (list reports)

1. Page renders `ReportsPage` (web, feature `reports`).
2. A hook calls `reportsApi.list()` (axios `GET /api/reports`).
3. nginx matches `/api` and proxies to `api:4000`.
4. Elysia route → `reports.service` → Drizzle → Postgres.
5. JSON returns the same way; TanStack Table renders it.
