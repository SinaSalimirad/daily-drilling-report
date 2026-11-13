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
 │  + Drizzle  │               │ Query/Table │
 └──────┬──────┘               │ /Form+axios │
        │ SQL                  └─────────────┘
        ▼
 ┌─────────────┐
 │  Postgres   │  private network only
 └─────────────┘
```

## Components

| Component | Tech | Responsibility |
| --- | --- | --- |
| `apps/web` | Bun, Next.js, TanStack Query + Table + Form, shadcn/ui, axios | UI, forms, tables; talks to the API via `/api` |
| `apps/api` | Bun, Elysia, Drizzle ORM, zod, OpenAPI | Versioned HTTP API (`/api/v1/...`), business logic, **owns the database** (schema, migrations) |
| `postgres` | PostgreSQL | Persistent data, reachable only from `api` |
| `nginx` | nginx | Routes `/api/*` to api, the rest to web; security headers, gzip, rate limit (prod) |

## Key decisions

1. **Database lives inside `apps/api`**, not in a shared `packages/` folder. Only the API talks to Postgres, so schema, migrations and the Drizzle config sit next to the code that uses them.
2. **Same-origin through nginx.** The browser only knows `/api`, so there is no CORS in normal use and no API URL baked into the frontend.
3. **Feature-based folders** in both apps: everything for one feature (table, routes, service, UI, hooks) is in one folder. See [folder-structure.md](folder-structure.md).
4. **No `packages/` yet.** Add one only when code is genuinely shared by both apps (for example API types), not before.
5. **Migrations run as a one-shot step** before the API starts, never inside the API process.

## Request flow example (list products)

1. Page renders the products page (web, feature `product`).
2. A hook calls `product.api` (axios `GET /api/v1/products`).
3. nginx matches `/api` and proxies to `api:4000`.
4. Elysia route → `products.service` → Drizzle → Postgres.
5. JSON returns the same way; TanStack Query caches it and TanStack Table renders it.

## Current status

Implemented end to end: **products** and **inventories** (API + web UI, CRUD with two-step delete).
Schema only: **wells**, **reports**, **sections**. The daily drilling report itself is not usable yet.
See [roadmap.md](roadmap.md).
