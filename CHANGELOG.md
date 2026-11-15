# Changelog

All notable changes, per release. Written from the commit list at release time (`docs/12-roadmap-and-release-plan.md`): `feat` → Added, `fix` → Fixed, breaking changes on top. Versions follow SemVer.

## [0.2.0] — 2026-11-15 — Master data and units

No breaking changes.

### Added
- Calc: unit conversion (`toSI`, `fromSI`, `convert`) with exact factors, and the `si` and `workbook` unit-system presets (#15)
- Schemas: shared zod base schemas (ids, pagination, sorting, dates) and the workbook's closed lists as enums (#16)
- API: lookup tables (activities, sample sources, fluid systems, pit mud types) with an idempotent `db:seed:lookups` and a read route (#17); the workbook's activity list and pit mud types as seeded values (#17)
- API: projects with a display unit system per project (#18)
- API: wells under a project, archived instead of deleted (#19)
- API: pits of a project, deleted when unused and archived once referenced (#20)
- API: pumps with the pump output per stroke from liner, stroke and efficiency (#21)
- API: solids-control equipment (shakers, desanders, desilters, centrifuges, …) (#22)
- API: product catalogue and the price list of a project (#23)
- Web: format layer and a unit-aware number input that shows the project's units and sends SI (#24)
- Web: projects and wells pages, with the unit-system setting (#25)
- Web: rig equipment pages for pits, pumps and solids-control units (#26)
- Web: products and price list pages (#27)
- Database: `db:seed:demo` with the analysed workbook's master data (report 1, PYW-24ST1) (#28)

### Fixed
- API: a delete blocked by an `ON DELETE RESTRICT` foreign key is treated as a referenced row (409 `IN_USE`, or archive), not a server error (#83)
- Web: dates from the API stay `YYYY-MM-DD` strings in the Eden client instead of being turned into `Date` objects (#87)
- Web: text typed in the add row of an editable table is kept while the previous row is being created (#91)

### Documentation
- Known-issues register `docs/known-issues.md`: problems found along the way, each with its GitHub issue (#97)

### Known issues
- KI-001 (#95): catalogue items counted per piece (Mud Skid, Tarpaulin) cannot be entered; left out of the demo seed.
- KI-002 (#96): the analysed workbooks have no unit prices; the demo seed has no price list. To decide before v0.4.0.

## [0.1.0] — 2026-11-15 — Foundation

No breaking changes (first release).

### Added
- API: environment variables validated with zod; the API refuses to start with a missing or malformed setting (#6)
- API: request id (reused from Nginx or generated) and one log line per request — readable in development, JSON in production (#8)
- API: error classes and the single error handler; one error body with `requestId` (#9)
- Database: Drizzle client, column helpers (`id`, `timestamps`, `authorship`), `db:generate` / `db:migrate` / seed scripts, baseline migration (#7)
- API: open permission guard, `GET /api/health` (503 when the database is down), `/api/v1` group and `type App` export (#10)
- Web: app shell with shadcn/ui and Tailwind — sidebar layout, page header, toasts, error boundary, not-found page (#11)
- Web: Eden Treaty client, TanStack Query, `ApiError`; the home page shows API and database health (#12)

### Fixed
- Web: the error boundary uses Next.js 16's `retry()` and survives non-`Error` values; the not-found page's link button has correct semantics (#65)
- Nginx: the access log states request time in seconds as `durationS` (was mislabelled `durationMs`) (#67)

### Infrastructure and tooling
- Project documentation (#1); documents aligned with what was built (#68)
- Bun workspaces and folder layout (#2); Biome and root scripts (#3); issue and pull request templates, protected `main` (#4)
- Docker Compose for local development: PostgreSQL 18.6, api on Bun, web built with Bun and run on Node LTS (#5)
- Nginx in front of web and API on one origin, also in local development (#13)
- Pull request pipeline: lint, type check, test (with PostgreSQL), build — all required (#14)
- Component files named in PascalCase (#66)

[0.2.0]: https://github.com/SinaSalimirad/daily-drilling-report/releases/tag/v0.2.0
[0.1.0]: https://github.com/SinaSalimirad/daily-drilling-report/releases/tag/v0.1.0
