# daily-drilling-report

DMR Online: a web application that replaces the macro Excel workbook for the Daily Drilling Fluids (Mud) Report.

## Run it locally

Needs [Bun](https://bun.sh) 1.4 and Docker. Details in [doc 11](docs/11-environments-and-deployment.md).

```sh
bun install
cp .env.example .env                    # change ports there if 5432 or 80 are taken
docker compose up -d postgres nginx     # database, and Nginx on http://localhost
bun run --cwd apps/api db:migrate
bun run dev                             # api and web on the host, behind Nginx
```

Open http://localhost (always through Nginx: web and API share one origin). To run the whole stack in containers instead: `docker compose up -d --build`.

Checks, as in CI: `bun run lint`, `bun run typecheck`, `bun test` (needs the database), `bun run build`.

## Documentation

| Document | Content |
|---|---|
| [01 — Architecture overview](docs/01-architecture-overview.md) | Parts of the system, request flow and design principles |
| [02 — Folder structure](docs/02-folder-structure.md) | Monorepo layout, API modules, dependency rules and naming |
| [03 — Database schema and migrations](docs/03-database-schema-and-migrations.md) | What is stored in PostgreSQL and how the schema changes |
| [04 — API conventions](docs/04-api-conventions.md) | Shape of an Elysia route consumed through Eden Treaty |
| [05 — Error flow](docs/05-error-flow.md) | How errors are raised, turned into responses and shown |
| [06 — Logging](docs/06-logging.md) | What is logged, so a failed request can be traced by its request id |
| [07 — Authentication and authorization](docs/07-authentication-and-authorization.md) | better-auth sessions, roles, permissions and well assignment |
| [08 — Calculation engine spec](docs/08-calculation-engine-spec.md) | Packaging, units and test rules of the calculation engines |
| [09 — Testing strategy](docs/09-testing-strategy.md) | What must be tested and how |
| [10 — Git workflow](docs/10-git-workflow.md) | Issues, branches, commits, pull requests and releases |
| [11 — Environments and deployment](docs/11-environments-and-deployment.md) | Environments, configuration and deployment |
| [12 — Roadmap and release plan](docs/12-roadmap-and-release-plan.md) | Versions, their scope and the definition of done |
| [Stack decisions](docs/stack-decisions.md) | Chosen libraries and the product decisions that shape the code |
| [DMR workbook analysis](docs/DMR_Workbook_Analysis.md) | Reverse-engineering specification of the original Excel workbook |
