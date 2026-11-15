# 12 — Roadmap and Release Plan

Legend: **FIXED** = decided by the project owner. **PROPOSED** = suggested; change freely.

This document replaces the earlier `roadmap.md`.

## Versions

| Version | Theme | Status | Issues |
|---|---|---|---|
| v0.1.0 | Foundation | PROPOSED | detailed |
| v0.2.0 | Master data and units | PROPOSED | detailed |
| v0.3.0 | Daily report shell | PROPOSED | detailed |
| v0.4.0 | Chemical inventory and cost | PROPOSED | epic |
| v0.5.0 | Geometry, volumes, accounting | PROPOSED | epic |
| v0.6.0 | Mud samples, rheology, solids (WBM and brine) | PROPOSED | epic |
| v0.7.0 | Survey, hydraulics, hole cleaning | PROPOSED | epic |
| v0.8.0 | Report page, print, recap, result snapshots | PROPOSED | epic |
| **v0.8.5** | **Rounding rule and workbook-defect review** | **FIXED** | epic |
| **v0.9.0** | **Auth (better-auth) and RBAC** | **FIXED** | epic |
| v1.0.0 | First production release | PROPOSED | epic |
| **v1.1.0** | **PDF and Excel export** | **FIXED** | epic |
| v1.2.0 | Persian (Jalali) calendar | PROPOSED number; feature FIXED | epic |
| v1.3.0 | Oil-based mud | PROPOSED | — |
| — | Offline entry and sync | parked | — |

Detailed issues exist for v0.1.0–v0.3.0 (`issues.md`). Each later version is one epic issue that is split into task issues when the version before it is released. Reason: later tasks depend on decisions not yet taken and on what the first versions teach.

## Decisions carried by this plan

- Stack as in `stack-decisions.md`; Eden Treaty, TanStack Form, no `axios`, no `uuid` package.
- Auth: better-auth, httpOnly cookie, RBAC — built in v0.9.0.
- Units: stored in SI; display units are a project setting.
- Language and calendar: English and Gregorian now; Persian calendar later.
- A submitted report can be edited; dependent results are recalculated.
- Rounding follows the workbook until v0.8.5.
- Report output is browser print until v1.1.0.

## Scope and exit criteria

### v0.1.0 — Foundation
Monorepo layout, Docker Compose, Nginx routing, Elysia skeleton (env validation, request ID, logging, error handler, open guard, health), Drizzle and migrations, web shell with Eden Treaty and TanStack Query, CI, Git conventions.
**Exit:** a pull request runs all checks; `docker compose up` serves a page that shows the API health through Nginx.

### v0.2.0 — Master data and units
Unit conversion and unit-system setting, projects, wells, pits, pumps, solids-control equipment, product catalogue and price list, lookups, demo seed.
**Exit:** the analysed workbook's header and master data can be entered through the UI and are displayed in the workbook's units.

### v0.3.0 — Daily report shell
Drilling sections, report creation with numbering and dating, header and depths, activities, remarks, pit readings with carry-over, draft / submitted status, revision check, warnings framework.
**Exit:** report 1 and report 2 of a well can be created, edited and submitted; pit readings carry over.

### v0.4.0 — Chemical inventory and cost
Inventory moves, stock and cost queries, products used list, key stock, negative-stock warning, inventory page.
**Exit:** inventory page equals the workbook's `Chem Inv.` for the demo data.

### v0.5.0 — Geometry, volumes, accounting
Wellbore geometry, BHA and bit, pump readings, volume engine, volume accounting with section and well totals, balance warning.
**Exit:** mud-volume block and accounting table equal the workbook for the demo data.

### v0.6.0 — Mud samples, rheology, solids
Sample form with a template per mud system (WBM, brine), PV / YP / n / K, salt and solids analysis.
**Needs first:** a workbook file from a drilling day, for fixtures.
**Exit:** sample block and solids block equal that workbook.

### v0.7.0 — Survey, hydraulics, hole cleaning
Survey and TVD, pressure losses, ECD, bit hydraulics, virtual / actual, hole cleaning.
**Exit:** hydraulics and hole-cleaning blocks equal the drilling-day workbook.

### v0.8.0 — Report page, print, recap
Full DMR page with print stylesheet, result snapshot on submit, stale-result recalculation after edits, recap by section and well, charts.
**Exit:** printed page can be laid next to the workbook print and compared block by block.

### v0.8.5 — Rounding rule and defect review (FIXED)
Decide the rounding rule of the new system and, for each workbook defect, keep or correct. Update `packages/calc`, tests, `ENGINE_VERSION` and `08-calculation-engine-spec.md`.
**Exit:** no `WORKBOOK-QUIRK` or `WORKBOOK-ROUNDING` marker without a recorded decision.

### v0.9.0 — Auth and RBAC (FIXED)
See `07-authentication-and-authorization.md`: better-auth, sessions, roles, permissions, well assignment, user management, authorship columns, audit log.
**Exit:** every route enforces a permission; the temporary Nginx restriction is removed.

### v1.0.0 — First production release
Backups with a tested restore, deploy pipeline, TLS and server hardening, smoke test, onboarding of a real well (master data and opening stock).
**Exit:** one real well is reported daily in the system.

### v1.1.0 — PDF and Excel export (FIXED)
Server-generated PDF of report and inventory pages; Excel export of reports and recap. Library chosen in this version.

### v1.2.0 — Persian calendar
Jalali date display and input as a user preference; storage stays Gregorian.

## Release procedure

1. Milestone has no open issue.
2. Manual checklist of `09-testing-strategy.md` passes on a fresh database.
3. `CHANGELOG.md` updated from the commit list (`feat` → Added, `fix` → Fixed, breaking changes on top).
4. Annotated tag on `main`; the release pipeline deploys (from v1.0.0; before that, tag only).
5. Next version's epic is split into task issues.

## Definition of done (every issue)

- Acceptance criteria met.
- Biome, type check, tests and build green.
- Calculation or derived-data change has a test.
- Schema change has its migration in the same pull request.
- Route follows `04-api-conventions.md` and declares its permission.
- Docs updated if behaviour or a convention changed.
- Squash-merged with a Conventional Commit title that closes the issue.
