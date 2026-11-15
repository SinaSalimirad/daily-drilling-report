# 04 — API Conventions

Elysia, zod validation, consumed by the web app through Eden Treaty.

## Base

- Base path: `/api/v1`. Health check: `/api/health` (unversioned).
- The API exports `type App = typeof app`; the web app builds its Eden client from it. A route that is not typed is not finished.
- OpenAPI page at `/api/docs` in development only.

## Resources

| Rule | Example |
|---|---|
| Plural, kebab-case nouns | `/wells`, `/pit-readings` |
| Nest only for ownership, one level | `/wells/:wellId/reports`, `/reports/:reportId/samples` |
| Address a known row directly | `/reports/:reportId` |
| Actions that are not CRUD are sub-resources with a verb | `POST /reports/:reportId/submit` |
| Read-only calculated views | `GET /wells/:wellId/stock`, `GET /reports/:reportId/result` |

| Method | Use | Success |
|---|---|---|
| GET | Read | 200 |
| POST | Create or run an action | 201 (create), 200 (action) |
| PATCH | Partial update | 200 |
| PUT | Replace a whole child collection (e.g. all pit readings of a report) | 200 |
| DELETE | Remove | 204 |

## Response shape

```jsonc
// single
{ "data": { "id": "…", "name": "PYW-24ST1" } }

// list
{ "data": [ … ], "meta": { "page": 1, "pageSize": 20, "total": 57 } }

// success with warnings (see 05-error-flow.md)
{ "data": { … }, "warnings": [ { "code": "VOLUME_NOT_BALANCED", "message": "…", "details": { "difference": 12.4 } } ] }

// error
{ "error": { "code": "NOT_FOUND", "message": "Well not found", "requestId": "…" } }
```

A body never has both `data` and `error`.

## Lists

- `page` (from 1) and `pageSize` (default 20, maximum 100).
- `sort=field:asc|desc`; only fields the route declares.
- Filters are plain query parameters named after the field: `?wellId=…&status=submitted&from=2026-07-01&to=2026-07-31`.
- Small fixed collections (pits of a project, lookups) are returned whole, without `meta`.

## Data formats

| Type | Format |
|---|---|
| ID | UUID string |
| Report date | `YYYY-MM-DD` |
| Moment in time | ISO 8601 UTC, `2026-07-28T19:30:00Z` |
| Measurement | JSON number, **SI** (see `03-database-schema-and-migrations.md`) |
| Quantity, money | JSON number (converted from `numeric` at the repository boundary) |
| Missing value | `null`; the key is always present |
| Enum | lower `snake_case` string |

The API never converts units. The client converts for display and converts user input back to SI before sending.

## Validation

- Every route declares zod schemas for `params`, `query`, `body` and the response.
- Schemas come from `@ddr/schemas`, generated from the Drizzle tables where possible and refined there.
- zod inside Elysia does not coerce: use `z.coerce.number()` and `z.coerce.date()` for `params` and `query`.
- Unknown body keys are rejected (`.strict()`).

## Concurrency

Rows that can be edited by more than one person carry `revision`. `PATCH` and `submit` send the revision they read; a mismatch returns `409 REVISION_MISMATCH` and the client reloads.

## Idempotency and uniqueness

Uniqueness is enforced by database constraints, and a violation becomes `409 CONFLICT` with the constraint named in `details`. Collections saved as a whole use `PUT`, so repeating the request is harmless.

## Versioning

Additive changes (new field, new route) stay in `v1`. A breaking change needs `v2` for that route. Before v1.0.0 breaking changes are allowed inside `v1`, because the only client is the web app in the same repository and the same pull request.

## Checklist for a new route

1. Path and method follow the tables above.
2. zod schemas for input and output.
3. Guard declared (permission name), even while the guard allows everything.
4. Service does the work; route only maps HTTP.
5. Errors are thrown as `AppError` subclasses, never returned by hand.
6. At least one integration test for the main path if the route changes data that other reports depend on.
