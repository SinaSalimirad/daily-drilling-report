# Changelog

All notable changes, per release. Written from the commit list at release time (`docs/12-roadmap-and-release-plan.md`): `feat` → Added, `fix` → Fixed, breaking changes on top. Versions follow SemVer.

## [1.0.0] — 2026-11-15 — First production release

No breaking changes since 0.9.0. **Read "Not met" below before relying on this release.**

### Added
- Backups: `infra/scripts/backup.sh` (nightly and pre-deploy, checked by reading the dump back, 14 daily and 8 weekly kept, optional off-server copy), `restore.sh` (into a new database only) and `verify-restore.sh` (restore into a scratch database and compare every table's row count) (#189)
- Release pipeline on a tag `v*`: smoke test on a scratch stack, then build and push the images, then deploy over SSH with backup, migrations, health check and rollback to the previous tag; production Compose file; Nginx with TLS, HTTP redirect and HSTS; Let's Encrypt with automatic renewal (#190)
- API build also produces `dist/migrate.js`, `dist/seed-admin.js` and `dist/seed-lookups.js`, so a server can migrate and be set up from the image (#190, #191)
- End-to-end smoke test `infra/smoke/smoke.test.ts` through the public URL: sign-in, a well and its report 1, inventory and pit readings, submit with the acknowledgement of warnings, the stored snapshot and the recap (#191)
- `docs/11`: first deployment of a server, server hardening commands, onboarding of a real well (#192)

### Not met (exit criteria of the roadmap)
- **"One real well is reported daily in the system."** Not done: it needs a server and a team, which this work did not have.
- **"A restore from backup has been performed."** Only on a development database: `verify-restore.sh` restored a backup of the local PostgreSQL into a scratch database and all 9 tables matched. No production restore.
- The release workflow, `deploy.sh`, TLS issuance and the rollback have **never run on a server**. Pushing this tag starts the workflow for the first time: it runs the smoke test, builds and pushes the images, and fails at the deploy step until the secrets of `release.yml` exist.
- The smoke test is API-level; no browser automation (KI-009, #195).
- Open from earlier versions: KI-005 (#140), KI-006 solids (#151), KI-007 hydraulics and hole cleaning (#160), KI-008 well scope of project lists (#183).
- The web pages were checked by typecheck, lint and build only, never in a browser; the manual web checklist of `docs/09-testing-strategy.md` has not been run.

## [0.9.0] — 2026-11-15 — Auth and RBAC

**Breaking:** the API and the web app now need a signed-in user. Before upgrading, set `BETTER_AUTH_SECRET` (the API refuses the development secret in production), `APP_ORIGIN`, and create the first administrator with `bun run db:seed:admin` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). The temporary Nginx access restriction is no longer needed.

### Added
- API: better-auth (email and password, sign-up closed, session in the database, `HttpOnly` / `SameSite=Lax` cookie, 7-day session renewed daily, passwords of at least 10 characters, five sign-ins a minute) with the admin plugin; tables through migration 0022 (#178)
- API: the four roles and the permission map of `docs/07` in `@ddr/schemas`; the guard answers 401 without a session (before the body is validated) and 403 without the permission; every `/api/v1` route needs a permission — checked by a test that calls every route anonymously (#178, #181)
- API: `created_by` / `updated_by` are filled from the session and have foreign keys to the user table (#178)
- API: well members and the well scope for engineers and clients, the coordinator's right to edit submitted reports only, clients reading submitted reports only; user management for admins (create, role, deactivate, password reset); the audit log of edits after submit (#179)
- Web: sign-in and sign-out, route protection, controls hidden by role, user management, well members, "edited after submit" with the last editor and time (#180)
- Infra: dependency audit in CI, Referrer-Policy and Permissions-Policy headers, the checklist of `docs/07` ticked (HTTPS and HSTS wait for v1.0.0) (#181)

### Fixed
- Environment variable names follow `docs/11` (`APP_ORIGIN`, `BETTER_AUTH_URL`) (#179)

### Known issues
- KI-008 (#183): the lists of a project (wells, pits, pumps, products) are not filtered by well membership.
- Migration 0022 was written by hand from better-auth's table layout; its CLI was not run. The sign-in, session, ban and password flows are covered by tests against the real better-auth.
- KI-005 (#140), KI-006 (#151), KI-007 (#160) are still open.
- The web pages were checked by typecheck, lint and build, not in a browser; the manual web checklist of `docs/09-testing-strategy.md` has not been run.

## [0.8.5] — 2026-11-15 — Rounding rule and defect review

**Calculated values change** (breaking for anyone comparing numbers with v0.8.0): the engines no longer round in between, and a few constants changed. `ENGINE_VERSION` is now `0.8.5`; snapshots written by earlier versions keep their own engine version.

### Changed
- Rounding happens only when a number is shown. The engines return exact values; the workbook rounded every cell "as displayed" and carried the rounded value on (for example 541.32 bbl from 86.06 m³ × 6.29; the exact value is 541.28 bbl). Tests name the workbook value next to the exact one and check that they agree to the workbook's displayed precision (#174)
- The workbook's approximate constants (6.29 bbl/m³, 3.785 L/gal, 2204 lb/t) are replaced by the exact factors of `docs/08`. This follows from the rounding decision; it is one constant each if the old values are wanted back (#174)
- Hydraulic horsepower of the bit divides by 1714, like the system horsepower (defect 6); one water weight: 62.4 PCF for pit tonnage, 8.345 ppg for hole cleaning (defect 7) (#174)
- The volume balance warning uses a tolerance of half a barrel instead of whole-barrel equality (#174)

### Decisions recorded
- `docs/08-calculation-engine-spec.md` has the table "Decisions of v0.8.5": every former `WORKBOOK-ROUNDING` / `WORKBOOK-QUIRK` marker and every defect of section 12 of the analysis is either corrected, kept on purpose (casing below casing counts zero, section / well losses recomputed with shakers as the balancing item, survey from the surface) or not applicable. No marker is left without a decision.

### Known issues
- KI-005 (#140), KI-006 (#151, solids), KI-007 (#160, hydraulics and hole cleaning) are still open.
- The web pages were checked by typecheck, lint and build, not in a browser; the manual web checklist of `docs/09-testing-strategy.md` has not been run.

## [0.8.0] — 2026-11-15 — Report page, print, recap

No breaking changes.

### Added
- API: result snapshots (`report_results`) written on submit and rewritten after any edit of a submitted report; the results of later reports are marked stale and recalculated on first read; the engine version is stored with each snapshot (#166)
- API: recap by section and by well — cost, chemicals consumption with concentration and cost share, volume accounting with the loss items, operation hours, average ROP (#167)
- Web: printable report page (A4 print stylesheet; print or "Save as PDF" from the browser), recap page with cost, loss and operation-hours charts, pressure-loss chart in the hydraulics block (#168)

### Notes
- Integration scenarios 5 (submit writes the snapshot) and 6 (edit after submit: revision, rewritten snapshot, stale later reports, `REVISION_MISMATCH`) pass.
- `ENGINE_VERSION` is now `0.8.0`.

### Known issues
- **Not met: "Printed page can be compared with the workbook print block by block."** The print page shows the blocks of the DMR but has not been laid next to the workbook print; the solids block (KI-006, #151) and the hydraulics block (KI-007, #160) are not verified against the workbook.
- KI-005 (#140) is still open.
- The web pages were checked by typecheck, lint and build, not in a browser; the manual web checklist of `docs/09-testing-strategy.md` has not been run.

## [0.7.0] — 2026-11-15 — Survey, hydraulics, hole cleaning

No breaking changes.

### Added
- Calc: directional survey (the `Incl` 30-slice TVD method, TVD and inclination at a depth), hydraulics (power-law pipe and annulus pressure loss, bit pressure loss, HHP, HSI, jet velocity, impact force, system horsepower, ECD, scaling to the measured pressure) and hole cleaning (angle factor, slip velocity, transport efficiency, cutting concentration, index and verdict) (#157)
- API: survey stations of a well with `SURVEY_DEPTH_NOT_INCREASING` and the `SURVEY_NOT_UPDATED` warning; report rate of penetration and cutting size; the hydraulics and hole-cleaning results of a report in virtual or actual mode, with a list of what is missing when they cannot be calculated (#158)
- Web: survey table on the well page; hydraulics and hole-cleaning section on the report page with the per-segment table (#159)

### Known issues
- **Not met: "Hydraulics and hole-cleaning blocks equal the drilling-day workbook."** The engines follow the formulas of the analysis, but no complete drilling-day value was extracted from the workbooks, so the tests are consistency checks. One branch of the slip velocity is an assumption (`// ASSUMED`). Annular segments are cut per string component, not the workbook's four fixed sections. KI-007 (#160).
- KI-005 (#140) and KI-006 (#151) are still open.
- The web pages were checked by typecheck, lint and build, not in a browser; the manual web checklist of `docs/09-testing-strategy.md` has not been run.

## [0.6.0] — 2026-11-15 — Mud samples, rheology, solids

No breaking changes.

### Added
- Calc: rheology (plastic viscosity, yield point, power-law constants for pipe and annulus), salt (brine density and NaCl % from chlorides) and solids engines (weighted, unweighted, bentonite, mass concentration) (#148)
- API: mud samples per report — typed columns for what the engines read, a JSON field for the template of the mud system, up to six samples — with PV and YP derived, the results of the latest sample (power-law constants, brine density, NaCl) and the plan of the section against the latest sample (#149)
- Web: samples section on the report page with the derived values, the results block and plan against actual (#150)

### Known issues
- **Not met: "Sample and solids blocks equal a drilling-day workbook."** The sample, rheology and salt values equal the workbook (PV 36 and YP 12; 1.198 and 25.89 % for 188 000 mg/L; NaCl 24.6 % on day 10), but the solids analysis does not: the sheet prints other numbers than the formulas of the analysis give, and the salt tables are not ported. The solids result is therefore not exposed by the API. KI-006 (#151).
- KI-005 (#140) from v0.5.0 is still open.
- The web pages were checked by typecheck, lint and build, not in a browser; the manual web checklist of `docs/09-testing-strategy.md` has not been run.

## [0.5.0] — 2026-11-15 — Geometry, volumes, accounting

No breaking changes.

### Added
- Calc: geometry engines (section volume, hole volume at the bit and at TD with the workbook's roundings, total hole volume, average hole diameter) and string engines (drill pipe length, steel, internal and closed-displacement volumes, total flow area) (#131)
- Calc: volume engines (hole / string / annulus / below bit, total circulating volume, flow rate, bottoms-up, circulation time, drilled volume, pit tonnage) and accounting engines (built volume, total losses, end volume, balance check, section and well columns) (#132)
- API: hole sections of a well (the workbook's `WBG`), with the total hole volume and average diameter (#133)
- API: BHA runs with components, bit and nozzles; the report chooses the run in the hole; `BHA_TOOL_PRESSURE_REQUIRED` for a motor or tool without a pressure loss (#134)
- API: pump readings, standpipe pressure, fluid-not-mud volume, the volume entries and the volume results — mud-volume block and the accounting table (daily, section, well) — with the `VOLUME_NOT_BALANCED` warning (#135)
- Web: wellbore geometry table and drill-string pages (#136)
- Web: pumps, volume entries, mud-volume block and accounting table on the report page; standpipe pressure and fluid-not-mud in the header (#137)

### Notes
- Formulas were read cell by cell from the analysed workbooks (`DMR-SAVA-001` and `DMR-SAVA-010`). The day-10 file gives the golden values: hole 518, string 50.3, annulus 137, below bit 331 and total circulating volume 454 bbl, end volume 1256 = 518 + 267 + 471 (balance 0); report 1 gives 541.32 bbl, 674.1 bbl, 28.686 MT, 180.4 and 721 bbl.
- Copied workbook behaviour is marked `WORKBOOK-ROUNDING` and `WORKBOOK-QUIRK` for v0.8.5 (for example the different ID rounding at the bit depth and at TD, and a casing below a casing counting as zero).

### Known issues
- KI-005 (#140): linear weight and grade of a hole section are not stored.
- Bottoms-up and circulation time have no workbook value (the files have no pump rate), so their tests apply the cell formulas by hand.
- The web pages were checked by typecheck, lint and build, not in a browser; the manual web checklist of `docs/09-testing-strategy.md` has not been run.

## [0.4.0] — 2026-11-15 — Chemical inventory and cost

No breaking changes.

### Added
- Calc: inventory engines `finalStock`, `chemicalVolume`, `costOf` and `stockMass` with the workbook's constants (#119)
- API: inventory moves per report (received and used packages) with the unit price copied onto each move, and stock computed from the earlier reports of the well (#120)
- API: daily, section, monthly and cumulative cost with the local-origin part, stock value, usage totals, products used last 24 h, and the key-stock flag on the price list (at most five per project) (#121)
- API: `NEGATIVE_STOCK` warning, acknowledged at submit like the other warnings (#122)
- Web: inventory section on the report page — received and used inputs, live final stock, cost summary, products used last 24 h, key-stock box — and a key-stock column on the price list (#123)

### Decisions recorded
- KI-001 (#95) set aside: the catalogue holds consumables only. KI-002 (#96): cost tests use invented prices, marked as not from the workbook.
- `stockMass` is the stock in kg (package size × count; volume units through the specific gravity).

### Known issues
- No per-product usage of report 1 is documented, so `chemicalVolume`, `costOf` and `stockMass` are tested with the §7.2 formulas applied by hand; only `finalStock` has a workbook value (164).
- The web pages were checked by typecheck, lint and build, not in a browser, and the manual web checklist of `docs/09-testing-strategy.md` has not been run.

## [0.3.0] — 2026-11-15 — Daily report shell

No breaking changes.

### Added
- API: drilling sections of a well, with hole size, fluid type and system and the planned mud weight, yield point and fluid loss (#29)
- API: daily reports with numbering (previous + 1) and dating (previous day + 1; the spud date for the first report), `REPORT_DATE_TAKEN`, and deletion of the newest draft only (#30)
- API: report header update — section, bit depth, TD, TVD, representatives, engineers, remarks, formation — with a revision check (`409 REVISION_MISMATCH`) and the daily drilled length (#31)
- API: report activities with total hours and present activity; a total other than 24 h is a warning, not an error (#32)
- API: pit readings with carry-over from the previous report, volume against capacity, mud-weight range and totals per pit type (#33)
- API: warnings on every report save, `POST /reports/:id/submit` with acknowledgement of open warnings, edits after submit that raise the revision, and domain events in the log (#34)
- Web: drilling sections table on the well page (#35)
- Web: report list per well and a "New report" dialog with the proposed number and date (#36)
- Web: report editor for header, depths, activities and remarks (#37)
- Web: pit readings table with totals per pit type (#38)
- Web: warnings panel, submit dialog with acknowledgement, status badge, "edited after submit" note and the revision conflict dialog (#39)

### Fixed
- API: an unknown fluid system on a section is a 422 on the field, not a misleading `409 IN_USE` (#113)

### Known issues
- KI-001 (#95) and KI-002 (#96) from v0.2.0 are still open.
- The web pages of this release were checked by typecheck, lint and build, and the API by its integration tests; the manual web checklist of `docs/09-testing-strategy.md` has not been run on a fresh database.

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
