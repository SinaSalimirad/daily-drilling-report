# Roadmap and release plan

Versioning follows semantic versioning. The project stays on `0.x` until the v1.0.0 criteria
below are met.

## Where we are (v0.3, 2026-11-13)

| Area | Status |
| --- | --- |
| Projects, wells, sections, reports, products, inventories | Done: API (CRUD, validation, constraint errors) + web page (table, add/edit sheet, delete dialog) |
| Daily report as a document (one page per report with its inventories, totals, print) | Not started; today a report is one row in a table and its inventories live on a separate page |
| Authentication and roles | API done (login, sessions, roles on every route, user management); web login page done (dashboard guard, logout and `useCan` not yet). See [authentication.md](authentication.md) |
| Tests | Schema, env and plugin unit tests (API), database tests for auth, users and route permissions (API, real Postgres), form unit tests (web); all run in CI. No end-to-end tests |
| Logging and error handling | Done; see [logging.md](logging.md) and [error-flow.md](error-flow.md) |
| Local Docker stack (`compose.dev.yml`, nginx) | Works; migrations are run from the host |
| Production compose, image build and deploy workflows | Not written (`docker-build.yml`, `deploy-*.yml`, `compose.prod.yml`, `migrate` service) |

## Milestones

| Version | Goal |
| --- | --- |
| `v0.3.0` | All six entities with CRUD in API and web (current state) |
| `v0.4.0` | Authentication and roles ([authentication.md](authentication.md)); deletes restricted to managers |
| `v0.5.0` | Report page: one daily report with its section, depths and inventory table in one view; `final` carried over as the next day's `init`; export to CSV/PDF (the "Export" button on the products page is a placeholder today) |
| `v0.6.0` | Deployment: `compose.prod.yml` with a one-shot `migrate` service, image build to GHCR, staging deploy from `development`, production deploy from `main` with approval; database backups scheduled |
| `v1.0.0-rc.1` | Limited beta with real users on staging |
| `v1.0.0` | Production release |

## Smaller items (do in any milestone)

- Server-side pagination or filtering once a list grows past a few thousand rows; today every
  `GET /v1/<x>` returns all rows and the table pages in the browser.
- Audit columns (`created_by`, `updated_by`) once users exist.
- Dashboard home page with real content (today it is a placeholder) and the sidebar's
  "Daily Reports", "Operations", "Reports & Analytics" and "Settings" links.
- A CI check that `bun run db:generate` produces no diff, to catch forgotten migrations.
- Database tests for the constraint paths (409/422) of the other features; the setup exists
  (`apps/api/test/preload.ts`, `test/helpers.ts`, Postgres service in CI).
- Periodic cleanup of revoked and expired `sessions` rows.
- Rename the `section` table to `sections` for consistency (needs a migration).

## v1.0.0 criteria

1. A full daily drilling report can be created, viewed and edited from one page.
2. Users must log in; permissions are enforced on the API.
3. Critical logic (report calculations, validation, constraint handling) has tests, and CI runs them.
4. `development` → staging → production pipeline works, with at least one production deploy done
   with approval.
5. Database backups are scheduled and a restore was tested.
6. Real users used it on staging for one to two weeks with no critical bugs open.

## Cutting a release

1. Open a PR `development` → `main`, merge commit (not squash) so the branches keep shared history.
2. Tag on `main`: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
3. Bump `version` in `apps/api/src/plugins/openapi.plugin.ts` so the OpenAPI page shows the release.
