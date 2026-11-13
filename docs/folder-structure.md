# Folder structure

```
daily-drilling-report/
├── apps/
│   ├── api/                          # Bun + Elysia + Drizzle (backend AND database)
│   │   ├── drizzle/                  # generated SQL migrations (committed)
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── index.ts              # server entry: plugins + routes + listen (prefix /api)
│   │   │   ├── routes.ts             # registers every feature's routes under /v1
│   │   │   ├── config/               # env parsing/validation
│   │   │   ├── plugins/              # cors, openapi, logging, db-errors
│   │   │   ├── lib/helpers/          # helpers shared by features (e.g. schema-fields)
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Drizzle client
│   │   │   │   ├── schema.ts         # re-exports every feature's tables
│   │   │   │   └── _shared/          # shared column definitions
│   │   │   └── features/             # inventories, products, reports, sections, wells
│   │   │       └── <feature>/
│   │   │           ├── <feature>.schema.ts       # Drizzle table(s) + zod schemas
│   │   │           ├── <feature>.schema.test.ts  # unit tests (bun test)
│   │   │           ├── <feature>.model.ts        # request/response validation
│   │   │           ├── <feature>.service.ts      # business logic + queries
│   │   │           └── <feature>.routes.ts       # Elysia routes
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                          # Bun + Next.js
│       ├── public/
│       ├── src/
│       │   ├── app/                  # Next App Router: routes only, thin (dashboard/...)
│       │   ├── features/             # product, inventory, report, well
│       │   │   └── <feature>/
│       │   │       ├── api/          # axios calls
│       │   │       ├── components/   # tables, forms, sheets, dialogs
│       │   │       ├── hooks/        # data hooks (TanStack Query / Form)
│       │   │       ├── lib/          # form helpers + tests
│       │   │       └── type.ts
│       │   ├── components/ui/        # shadcn/ui primitives
│       │   ├── shared/components/    # UI used by several features (sidebar, pagination, providers)
│       │   ├── hooks/                # generic hooks (use-mobile, use-debounce)
│       │   └── lib/                  # axios instance, query client, utils
│       ├── Dockerfile
│       └── package.json
├── infra/
│   ├── docker/                       # compose.dev.yml (compose.prod.yml not written yet)
│   └── nginx/                        # nginx.dev.conf, nginx.prod.conf
├── docs/                             # this documentation
├── .github/
│   ├── workflows/                    # CI/CD (see ci-cd.md)
│   └── dependabot.yml
├── package.json                      # Bun workspaces root + scripts
├── tsconfig.base.json                # shared TS settings
├── biome.json                        # lint + format
├── .env.example
└── .gitleaks.toml
```

> Status: `reports`, `sections` and `wells` only have a schema on the API side so far (no routes/service yet). The web has `report` and `well` feature folders, but no pages wired up.

## Rules

- **A feature is a vertical slice.** Add a feature by creating `features/<name>/` in api and/or web. Do not scatter it across `controllers/`, `models/`, `utils/` layers.
- **Features do not import each other's internals.** If two features need the same thing, move it to `shared/`.
- **`app/` (web) stays thin.** Route files import a page component from `features/`.
- **Database changes** live in the API: edit `*.schema.ts` → `bun run db:generate` → commit the new SQL in `apps/api/drizzle/`.
- **New table?** Export it from `apps/api/src/db/schema.ts`, otherwise Drizzle will not see it.

## Adding a feature (checklist)

1. API: create `features/<name>/` with schema, model, service, routes; register routes in `routes.ts` and the table in `db/schema.ts`.
2. `bun run db:generate`, review the SQL, commit it.
3. Web: create `features/<name>/` with `api/`, `hooks/`, `components/`; add a route in `app/dashboard/` that renders the page and a link in the sidebar.
4. Add tests and update docs if the architecture changed.
