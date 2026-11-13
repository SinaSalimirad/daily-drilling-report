# Error flow

How a failure travels from Postgres or the API to the message the user sees, and which status
code means what. The rule: **the API maps every known failure to a 4xx with a JSON body
`{ "message": string }`; the web decides the wording the user sees from the status code.**

```
Postgres constraint ─┐
zod validation ──────┼─► Elysia ──► HTTP status + body ──► axios ──► TanStack Query ──► UI
NotFoundError ───────┤   (db-errors plugin, built-in handlers)        (interceptor)      (sheet error / toast)
rate limiter ────────┘
```

## Status codes the API returns

| Status | When | Where it comes from | Body |
| --- | --- | --- | --- |
| `200` | Success. `DELETE` returns an empty body. | route handler | row / rows / empty |
| `404` | No row with that id (`GET /:id`, `PATCH /:id`, `DELETE /:id`) | service throws Elysia `NotFoundError` | plain text `Project "<id>" not found` |
| `409` | **Duplicate**: unique constraint (`23505`), e.g. project name, well name inside a project, section name or sequence inside a well, report number or date inside a well, product name+size+unit, product inside a report | `plugins/db-errors.plugin.ts` | `{ message: "A record with the same values already exists." }` |
| `409` | **Still referenced**: foreign key violation (`23503`) on `DELETE`, e.g. a project that has wells | `db-errors.plugin.ts` | `{ message: "This record is used elsewhere and can't be deleted." }` |
| `422` | **Invalid body / params / query**: a zod rule failed (blank name, non-uuid id, negative depth, offshore rig without water depth, ...) | Elysia's built-in validation | `{ type: "validation", on: "body", property, message, errors: [...] }` |
| `422` | **Missing reference**: foreign key violation (`23503`) on `POST` / `PATCH`, e.g. `projectId` of a project that does not exist, or a `sectionId` of another well | `db-errors.plugin.ts` | `{ message: "A referenced record does not exist or belongs to a different parent." }` |
| `422` | **Database check** (`23514`), e.g. width without height (only reachable if the zod rule and the DB rule disagree) | `db-errors.plugin.ts` | `{ message: "One of the values is not allowed by the database." }` |
| `429` | Too many requests from one client IP (global or write limit) | `plugins/rate-limit.plugin.ts` | `{ message: "Too many requests, please try again later." }` |
| `500` | Anything else (database down, bug) | Elysia default | generic |

### Why 409 and 422 are split the way they are

A foreign key violation is one SQLSTATE but two different situations. On a `DELETE` the row the
client named exists and is in use: a **conflict** with current state (`409`). On a `POST` or
`PATCH` the body names a parent that is not there: the **input** is wrong (`422`), the same
class as a failed zod rule. The plugin looks at `request.method` to tell them apart.

### Where the rules live

1. **zod schemas** in `features/<name>/<name>.schema.ts` (`insert…Schema`, `update…Schema`) are
   the first line: shape, types, enums, trims, positive numbers, cross-field rules such as
   "offshore needs water depth" and "width and height together". Elysia validates `body`,
   `params` and `query` with them before the handler runs.
2. **Database constraints** (unique, foreign key, check) are the last line and the only one that
   is safe under concurrent requests. The service does not pre-check for duplicates; it lets the
   insert fail and the plugin translates the error.
3. **`NotFoundError`** is thrown by the service when a query by id returns nothing.

### How the plugin finds the SQLSTATE

Drizzle wraps the driver error: the node-postgres error is in `error.cause`, and its `code` is
the SQLSTATE. `sqlState()` in `db-errors.plugin.ts` reads `cause.code` first and falls back to
`error.code`. The plugin is registered with `{ as: "global" }` before the routes in
`src/index.ts`, so it covers every feature.

## Web side

```
axios instance (lib/axios.ts)
  └─ response interceptor: logs the failure to the console, rejects with the AxiosError
       └─ TanStack Query mutation rejects
            ├─ create / edit sheet: catch → setSubmitError(message by status) → shown under the form
            └─ delete dialog: useMutation onError → toast.error(message by status)
```

- **Lists** (`useQuery`): the page shows a "Could not load … Try again" box with a refetch button.
  Queries retry once and are considered fresh for 30 seconds.
- **Create / edit** (`mutateAsync` inside the form's submit): the sheet stays open, keeps what the
  user typed, and shows the error under the fields. A `409` gets a feature-specific duplicate
  message (e.g. "A well with this name already exists in this project."); anything else gets
  "Could not save the … Please try again."
- **Delete** (`mutate` with `onError`): a toast. A `409` gets an explanation of what still uses
  the row (e.g. "This project has wells, so it can't be deleted."); anything else a generic
  "Could not delete …".
- **Success**: a toast ("Well added"), the feature's query key is invalidated and the table
  refetches. `mutateAsync` resolves only after that refetch, so the sheet closes with fresh data.
- **Form validation** (TanStack Form, `features/<name>/lib/<name>-form.ts`) runs on every change
  and blocks submit, so a `422` from the API is rare and is shown with the generic message.
  The rules are mirrored by hand; the API stays the source of truth.

## Adding a new rule

| Rule type | Do this |
| --- | --- |
| Shape or value of a field | Add it to the zod schema in `<name>.schema.ts` and to `validate()` in the web `<name>-form.ts`; add a test in both `*.test.ts`. |
| Uniqueness or reference | Add the constraint to the Drizzle table, `bun run db:generate`, commit the SQL. Add a `409`/`422` message in the web hook or sheet if the generic one is not clear enough. |
| New kind of failure | Map it in `db-errors.plugin.ts` with a test in `db-errors.plugin.test.ts`, then teach the web the new status. |

## Checking it by hand

```bash
# 422: missing reference
curl -s -X POST localhost:4000/api/v1/wells -H 'content-type: application/json' \
  -d '{"projectId":"0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b","name":"X","designation":"exploration",
       "spudDate":"2026-01-01","wellType":"Vertical","rigName":"R","rigType":"onshore"}'

# 404
curl -s localhost:4000/api/v1/projects/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b

# 422: validation
curl -s -X POST localhost:4000/api/v1/projects -H 'content-type: application/json' -d '{"name":""}'
```
