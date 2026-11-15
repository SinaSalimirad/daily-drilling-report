# 09 — Testing Strategy

The aim is a small set of tests that protects the numbers on a contractual report, not broad coverage.

## What is tested

| Layer | Tested? | How | Why |
|---|---|---|---|
| `packages/calc` | **Always** | `bun test`, golden values from the workbook | A wrong number is printed and signed |
| `packages/schemas` | Where a schema has custom rules | `bun test` | Cheap, catches unit and range mistakes |
| API services that derive data from earlier reports | **Always** | `bun test` against a real PostgreSQL | Stock, totals and recalculation are where the workbook's logic was replaced |
| API CRUD routes | One main-path test per module | same | Proves wiring, validation and error shape |
| Web app | Not unit-tested for now | Manual checklist per release | Low value compared with cost at this stage |
| End to end | From v1.0.0: one smoke test | Browser automation | Create a report, submit, print view |

## Mandatory integration scenarios

Each is one test file, built on the demo seed (the workbook's report 1):

1. **Report numbering and dating** — next report gets number + 1 and date + 1; duplicate date is `REPORT_DATE_TAKEN`.
2. **Stock** — opening stock as received on report 1; stock after several days; negative stock raises a warning, not an error.
3. **Cost** — daily, section, monthly and cumulative cost; a later price change does not alter earlier reports.
4. **Volume accounting** — start volume equals the previous end volume; section and well totals; imbalance raises a warning.
5. **Submit** — warnings must be acknowledged; result snapshot is written.
6. **Edit after submit** — revision increases; the report's snapshot is rewritten; later reports are marked stale and recalculated; wrong revision is `REVISION_MISMATCH`.
7. **Error shape** — one validation error and one not-found return the body defined in `05-error-flow.md`.

From v0.9.0: one test per role for a forbidden action, and one for well scope.

## Conventions

- Runner: `bun test`. No other test framework.
- Location: next to the code, `*.test.ts`.
- Names: `describe('<function or route>')`, `it('<expected behaviour in plain words>')`.
- Fixtures: `packages/calc/fixtures/*.json`; database fixtures through the demo seed, not hand-written SQL in tests.
- Database tests run inside a transaction that is rolled back, or against a schema recreated per test file.
- No mocks of the database. No snapshot tests of large objects.
- A test asserts numbers at the workbook's displayed precision (see `08-calculation-engine-spec.md`).

## Rules of work

1. A function added to `packages/calc` arrives with its test in the same pull request.
2. A bug in a calculation or in derived data is fixed by first adding the failing test.
3. CI runs Biome, type check and all tests on every pull request; a red check blocks the merge.
4. A test that fails randomly is fixed or deleted the same day. It is never ignored.

## Manual release checklist (web)

Run before tagging a version, on a fresh database with the demo seed:

- [ ] Create a well with pits, pumps and products.
- [ ] Create a section and report 1; enter the workbook's values; compare the report page with the workbook print, number by number.
- [ ] Create report 2; check that pit readings were carried over and the start volume matches.
- [ ] Enter usage above stock; see the warning; submit with acknowledgement.
- [ ] Edit report 1 after submit; check report 2's totals changed.
- [ ] Print the report page; check it fits A4.
- [ ] Force a validation error and a server error; check the messages and the request ID.

## Not planned

- Coverage percentage targets.
- Component tests and visual regression tests.
- Load testing (a few users per well).
