# 02 — Folder Structure

Target layout of the `daily-drilling-report` monorepo (Bun workspaces). This was written without access to the existing repository; where the current code differs, move it toward this layout one module at a time.

```
daily-drilling-report/
├─ apps/
│  ├─ api/                      # Bun + Elysia
│  │  ├─ src/
│  │  │  ├─ index.ts            # starts the server
│  │  │  ├─ app.ts              # builds the Elysia app; exports `type App`
│  │  │  ├─ config/env.ts       # zod-validated environment
│  │  │  ├─ db/
│  │  │  │  ├─ client.ts        # pg pool + drizzle instance
│  │  │  │  ├─ schema/          # one file per table group
│  │  │  │  ├─ migrations/      # generated SQL, committed
│  │  │  │  └─ seed/            # lookups and demo data
│  │  │  ├─ plugins/            # request-id, logger, error-handler, guard
│  │  │  ├─ lib/                # errors.ts, pagination.ts, response.ts
│  │  │  └─ modules/
│  │  │     └─ <feature>/
│  │  │        ├─ routes.ts     # HTTP: path, schema, status code
│  │  │        ├─ service.ts    # rules, transactions, calls packages/calc
│  │  │        ├─ repository.ts # Drizzle queries only
│  │  │        └─ *.test.ts
│  │  ├─ drizzle.config.ts
│  │  └─ Dockerfile
│  └─ web/                      # Next.js, frontend only
│     ├─ src/
│     │  ├─ app/                # routes and layouts
│     │  ├─ components/ui/      # shadcn/ui components
│     │  ├─ components/         # shared app components
│     │  ├─ features/<feature>/ # components, hooks, table columns, form
│     │  └─ lib/                # api.ts (Eden client), query-client.ts, format.ts
│     └─ Dockerfile
├─ packages/
│  ├─ schemas/                  # zod schemas, enums, permission map
│  └─ calc/                     # engines, units, fixtures, tests
├─ infra/
│  ├─ nginx/                    # nginx.conf, site config
│  └─ scripts/                  # backup.sh, restore.sh, deploy.sh
├─ docs/                        # these documents
├─ .github/
│  ├─ workflows/                # ci.yml, release.yml
│  ├─ ISSUE_TEMPLATE/
│  └─ pull_request_template.md
├─ docker-compose.yml           # local development
├─ docker-compose.prod.yml
├─ biome.json
├─ .env.example
└─ package.json                 # workspaces
```

## API modules

| Module | Since | Content |
|---|---|---|
| `health` | v0.1.0 | Liveness and database check |
| `lookups` | v0.2.0 | Fixed lists (activities, sample sources, mud types) |
| `projects`, `wells` | v0.2.0 | Header data, unit system |
| `pits`, `pumps`, `sce` | v0.2.0 | Rig equipment |
| `products` | v0.2.0 | Catalogue and project price list |
| `sections` | v0.3.0 | Drilling sections |
| `reports` | v0.3.0 | Daily report, activities, remarks, status, revision |
| `pit-readings` | v0.3.0 | Daily pit status |
| `inventory` | v0.4.0 | Moves, stock, cost |
| `geometry`, `bha`, `volumes` | v0.5.0 | Hole and string, volume accounting |
| `samples` | v0.6.0 | Mud samples, rheology, solids |
| `surveys`, `hydraulics` | v0.7.0 | Survey, pressure losses, hole cleaning |
| `recap` | v0.8.0 | Section and well recap |
| `auth`, `users` | v0.9.0 | better-auth, roles, well assignment |

## Dependency rules

1. `routes` → `service` → `repository`. Never skip a layer, never go backwards.
2. `routes.ts` contains no SQL and no rules. `repository.ts` contains no rules and throws no HTTP errors.
3. A service may call another module's **service**, never its repository.
4. `packages/calc` imports nothing from the apps and performs no I/O.
5. `packages/schemas` imports only zod.
6. `apps/web` imports from `apps/api` **as a type only**: `import type { App } from '@ddr/api'`.
7. No file imports through a relative path that leaves its workspace; use the workspace name (`@ddr/schemas`, `@ddr/calc`).

## Frontend conventions

- **Server state** lives in TanStack Query only. No copy of server data in React state or context.
- **Data access**: one Eden Treaty client in `lib/api.ts`. Each feature exposes hooks (`useWells`, `useCreateWell`) that wrap it; components never call the client directly.
- **Query keys**: `[feature, 'list', filters]` and `[feature, 'detail', id]`. A mutation invalidates its feature's keys.
- **Forms**: TanStack Form with the zod schema from `@ddr/schemas`. Server validation errors are mapped back onto fields (see `05-error-flow.md`).
- **Tables**: TanStack Table; column definitions in `features/<feature>/columns.tsx`.
- **Units and formatting**: only through `lib/format.ts`, which calls `@ddr/calc/units`. No conversion factor appears in a component.
- **Dates**: Gregorian, ISO `YYYY-MM-DD` on the wire. Display formatting in `lib/format.ts`, so the later Persian calendar is a change in one file.
- **Text**: English. Keep user-facing strings out of deep logic so a second language can be added.
- **Pages are client-rendered**; Next.js server features (server actions, route handlers) are not used for data.

## Naming

- Files and folders: `kebab-case`. React components: `PascalCase.tsx`.
- Database: `snake_case`, plural table names.
- TypeScript: `camelCase` values, `PascalCase` types, no default exports except where Next.js requires them.
- Tests sit next to the code: `service.test.ts`.
