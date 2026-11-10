# Folder structure

```
daily-drilling-report/
├── apps/
│   ├── api/                          # Bun + Elysia + Drizzle (backend AND database)
│   │   ├── drizzle/                  # generated SQL migrations (committed)
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── index.ts              # server entry (listen)
│   │   │   ├── app.ts                # composes plugins + feature routes
│   │   │   ├── migrate.ts            # one-shot migration runner
│   │   │   ├── config/               # env parsing/validation
│   │   │   ├── db/
│   │   │   │   ├── client.ts         # Drizzle client
│   │   │   │   └── schema.ts         # re-exports every feature's tables
│   │   │   ├── shared/               # errors, middleware used by many features
│   │   │   └── features/
│   │   │       └── <feature>/
│   │   │           ├── <feature>.table.ts    # Drizzle table(s)
│   │   │           ├── <feature>.model.ts    # request/response validation
│   │   │           ├── <feature>.service.ts  # business logic + queries
│   │   │           └── <feature>.routes.ts   # Elysia routes
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                          # Bun + Next.js
│       ├── public/
│       ├── src/
│       │   ├── app/                  # Next App Router: routes only, thin
│       │   ├── features/
│       │   │   └── <feature>/
│       │   │       ├── api/          # axios calls
│       │   │       ├── components/   # tables, forms, pages of this feature
│       │   │       ├── hooks/        # data hooks
│       │   │       └── types.ts
│       │   ├── shared/components/    # UI used by several features
│       │   └── lib/                  # axios instance, query client
│       ├── Dockerfile
│       └── package.json
├── infra/
│   ├── docker/                       # compose.dev.yml, compose.prod.yml
│   └── nginx/                        # nginx.dev.conf, nginx.prod.conf
├── docs/                             # this documentation
├── .github/
│   ├── workflows/                    # CI/CD (see ci-cd.md)
│   └── dependabot.yml
├── package.json                      # Bun workspaces root + scripts
├── bunfig.toml
├── tsconfig.base.json                # shared TS settings
├── biome.json                        # lint + format
├── .env.example
└── .gitleaks.toml
```

## Rules

- **A feature is a vertical slice.** Add a feature by creating `features/<name>/` in api and/or web. Do not scatter it across `controllers/`, `models/`, `utils/` layers.
- **Features do not import each other's internals.** If two features need the same thing, move it to `shared/`.
- **`app/` (web) stays thin.** Route files import a page component from `features/`.
- **Database changes** live in the API: edit `*.table.ts` → `bun run db:generate` → commit the new SQL in `apps/api/drizzle/`.
- **New table?** Export it from `apps/api/src/db/schema.ts`, otherwise Drizzle will not see it.

## Adding a feature (checklist)

1. API: create `features/<name>/` with table, model, service, routes; register routes in `app.ts` and the table in `db/schema.ts`.
2. `bun run db:generate`, review the SQL, commit it.
3. Web: create `features/<name>/` with `api/`, `hooks/`, `components/`; add a route in `app/` that renders the page.
4. Add tests and update docs if the architecture changed.
