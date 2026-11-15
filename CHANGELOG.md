# Changelog

All notable changes, per release. Written from the commit list at release time (`docs/12-roadmap-and-release-plan.md`): `feat` → Added, `fix` → Fixed, breaking changes on top. Versions follow SemVer.

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

[0.1.0]: https://github.com/SinaSalimirad/daily-drilling-report/releases/tag/v0.1.0
