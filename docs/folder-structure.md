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
│   │   │   ├── config/               # env parsing/validation (env.ts + env.test.ts)
│   │   │   ├── plugins/              # cors, openapi, logixlysia (logging), rate-limit, db-errors (+ tests)
│   │   │   ├── lib/helpers/          # helpers shared by features (e.g. schema-fields)
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Drizzle client
│   │   │   │   ├── schema.ts         # re-exports every feature's tables
│   │   │   │   ├── seed.ts           # dummy projects/wells for local development
│   │   │   │   └── _shared/          # shared column definitions (uuid v7 id, timestamps)
│   │   │   └── features/             # projects, wells, sections, reports, products, inventories
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
│       │   ├── features/             # project, well, section, report, product, inventory
│       │   │   └── <feature>/
│       │   │       ├── api/          # axios calls (list, create, edit, remove)
│       │   │       ├── components/   # table, columns, toolbar, skeleton, empty state,
│       │   │       │                 # add sheet, edit sheet, form fields, delete dialog
│       │   │       ├── hooks/        # use-<feature>.ts (TanStack Query), use-<feature>-form.ts (TanStack Form)
│       │   │       ├── lib/          # form values <-> API payload, validate(), + tests
│       │   │       ├── constants.ts  # enum values/labels and table sizing
│       │   │       └── type.ts       # row and request body types (mirror the API)
│       │   ├── components/ui/        # shadcn/ui primitives
│       │   ├── shared/components/    # UI used by several features (sidebar, pagination, form fields, providers)
│       │   ├── hooks/                # generic hooks (use-mobile, use-debounce)
│       │   └── lib/                  # axios instance, query client, table features, utils
│       ├── Dockerfile
│       └── package.json
├── infra/
│   ├── docker/                       # compose.dev.yml (compose.prod.yml not written yet)
│   └── nginx/                        # nginx.dev.conf, nginx.prod.conf
├── docs/                             # overview, folder-structure, error-flow, logging, authentication, roadmap
├── .github/
│   ├── workflows/                    # ci.yml, lint.yml, secret-scan.yml (see overview.md)
│   └── dependabot.yml
├── package.json                      # Bun workspaces root + scripts
├── tsconfig.base.json                # shared TS settings
├── biome.json                        # lint + format
├── .env.example
└── .gitleaks.toml
```

> Status: every feature has API routes and a web page (projects, wells, sections, reports, products, inventories).

## Rules

- **A feature is a vertical slice.** Add a feature by creating `features/<name>/` in api and/or web. Do not scatter it across `controllers/`, `models/`, `utils/` layers.
- **Features do not import each other's internals.** If two features need the same thing, move it to `shared/`.
- **`app/` (web) stays thin.** Route files import a page component from `features/`.
- **Database changes** live in the API: edit `*.schema.ts` → `bun run db:generate` → commit the new SQL in `apps/api/drizzle/`.
- **New table?** Export it from `apps/api/src/db/schema.ts`, otherwise Drizzle will not see it.
- **Cross-cutting behaviour (CORS, rate limit, logging, error mapping) is an Elysia plugin** in `apps/api/src/plugins/`, registered once in `src/index.ts`. Features never configure these themselves.
- **Web and API types are mirrored by hand** (`features/<name>/type.ts` and `constants.ts` in the web). When an enum or column changes in a `*.schema.ts`, update the web file too; there is no shared package yet.

## Adding a feature (checklist)

1. API: create `features/<name>/` with schema, model, service, routes; register routes in `routes.ts` and the table in `db/schema.ts`.
2. `bun run db:generate`, review the SQL, commit it.
3. Web: create `features/<name>/` with `api/`, `hooks/`, `components/`, `lib/`, `type.ts`; add a route in `app/dashboard/<names>/page.tsx` and a link in `shared/components/menu-sidebar.tsx`.
4. Map the feature's `409` messages (duplicate, still referenced) in its hooks and sheets; see [error-flow.md](error-flow.md).
5. Add tests (`*.schema.test.ts` in the API, `lib/*-form.test.ts` in the web) and update the docs if the architecture changed.
