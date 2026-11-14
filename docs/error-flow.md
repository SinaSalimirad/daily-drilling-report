# Error flow

How a failure travels from Postgres or the API to the message the user sees, and which status
code means what. The rule: **the API maps every known failure to a 4xx with a JSON body
`{ "message": string }`; the web decides the wording the user sees from the status code.**

```
Postgres constraint ─┐
zod validation ──────┼─► Elysia ──► HTTP status + body ──► axios ──► TanStack Query ──► UI
NotFoundError ───────┤   (db-errors plugin, built-in handlers)        (interceptor)      (toast)
rate limiter ────────┘
```

## Status codes the API returns

| Status | When                                                                                                                                                                                                                    | Where it comes from                                      | Body                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `200`  | Success. `DELETE` returns an empty body.                                                                                                                                                                                | route handler                                            | row / rows / empty                                                                    |
| `401`  | No valid session: no cookie, unknown / revoked / expired / idle session, deactivated user. Also a failed login                                                                                                          | `plugins/auth.plugin.ts`, `features/auth/auth.routes.ts` | `{ message: "You need to log in." }` (login: `"Invalid email or password."`)          |
| `403`  | Logged in, but the route needs a higher role; an admin changing their own role or active status; login with an unverified email                                                                                         | `auth.plugin.ts`, `users.routes.ts`, `auth.routes.ts`    | `{ message: "You don't have permission to do this." }`                                |
| `404`  | No row with that id (`GET /:id`, `PATCH /:id`, `DELETE /:id`)                                                                                                                                                           | service throws Elysia `NotFoundError`                    | plain text `Project "<id>" not found`                                                 |
| `409`  | **Duplicate**: unique constraint (`23505`), e.g. project name, well name inside a project, section name or sequence inside a well, report number or date inside a well, product name+size+unit, product inside a report | `plugins/db-errors.plugin.ts`                            | `{ message: "A record with the same values already exists." }`                        |
| `409`  | **Still referenced**: foreign key violation (`23503`) on `DELETE`, e.g. a project that has wells                                                                                                                        | `db-errors.plugin.ts`                                    | `{ message: "This record is used elsewhere and can't be deleted." }`                  |
| `415`  | Login (`/auth/login` or `/auth/token`) sent with a content type other than `application/json` (blocks cross-site form posts)                                                                                            | `features/auth/auth.routes.ts`                           | `{ message: "Send the login as application/json." }`                                  |
| `422`  | **Invalid body / params / query**: a zod rule failed (blank name, non-uuid id, negative depth, offshore rig without water depth, ...)                                                                                   | Elysia's built-in validation                             | `{ type: "validation", on: "body", property, message, errors: [...] }`                |
| `422`  | **Missing reference**: foreign key violation (`23503`) on `POST` / `PATCH`, e.g. `projectId` of a project that does not exist, or a `sectionId` of another well                                                         | `db-errors.plugin.ts`                                    | `{ message: "A referenced record does not exist or belongs to a different parent." }` |
| `422`  | **Database check** (`23514`), e.g. width without height (only reachable if the zod rule and the DB rule disagree)                                                                                                       | `db-errors.plugin.ts`                                    | `{ message: "One of the values is not allowed by the database." }`                    |
| `429`  | Too many requests from one client IP (global, write or login limit)                                                                                                                                                     | `plugins/rate-limit.plugin.ts`                           | `{ message: "Too many requests, please try again later." }`                           |
| `500`  | Anything else (database down, bug)                                                                                                                                                                                      | Elysia default                                           | generic                                                                               |

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
  └─ response interceptor: on 401 refreshes once and repeats the request; otherwise logs the
     failure to the console and rejects with the AxiosError
       └─ TanStack Query mutation rejects
            └─ the mutation hook's onError → toast.error(apiErrorMessage(error, fallback, byStatus))
```

**Every mutation result is a sonner toast, and the messages live in one place: the mutation
hooks** (`features/<name>/hooks/use-<name>.ts`, `features/auth/hooks/use-auth.ts`). Components
never choose wording; a sheet's `catch` only returns `false` so it stays open.

`apiErrorMessage` (`lib/api-error.ts`) picks the text: the feature's message for the status
(`byStatus`), else a common one, else the hook's fallback:

| Situation              | Message                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| no response (network)  | "Can't reach the server. Check your connection and try again."                           |
| `401`                  | "Your session has ended. Please log in again."                                           |
| `403`                  | "You don't have permission to do this."                                                  |
| `429`                  | "Too many requests. Please wait a minute and try again."                                 |
| `409` on create / edit | feature-specific duplicate, e.g. "A well with this name already exists in this project." |
| `409` on delete        | what still uses the row, e.g. "This project has wells, so it can't be deleted."          |
| anything else          | the fallback, "Could not add / save / delete the … Please try again."                    |

Login overrides `401` ("Invalid email or password."), `403` (email not verified) and `429`
(`loginErrorMessage` in `features/auth/lib/login-form.ts`).

- **Lists** (`useQuery`): the page shows a "Could not load … Try again" box with a refetch button.
  Queries retry once and are considered fresh for 30 seconds.
- **Create / edit** (`mutateAsync` inside the form's submit): an error toast; the sheet stays
  open and keeps what the user typed.
- **Delete** (`mutate`): an error toast; the dialog decides itself whether to close.
- **Success**: a toast ("Well added", "Welcome, <name>", "You have been logged out"), the
  feature's query key is invalidated and the table refetches. `mutateAsync` resolves only after
  that refetch, so the sheet closes with fresh data.
- **Logout failure**: an error toast and the user stays. The HttpOnly cookies can only be
  cleared by the API, so going to `/login` anyway would fake a logout.
- **Form validation** (TanStack Form, `features/<name>/lib/<name>-form.ts`) runs on every change
  and blocks submit, so a `422` from the API is rare and is shown with the generic message.
  The rules are mirrored by hand; the API stays the source of truth.

## Adding a new rule

| Rule type                 | Do this                                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape or value of a field | Add it to the zod schema in `<name>.schema.ts` and to `validate()` in the web `<name>-form.ts`; add a test in both `*.test.ts`.                                            |
| Uniqueness or reference   | Add the constraint to the Drizzle table, `bun run db:generate`, commit the SQL. Add a `409`/`422` message in the web hook or sheet if the generic one is not clear enough. |
| New kind of failure       | Map it in `db-errors.plugin.ts` with a test in `db-errors.plugin.test.ts`, then teach the web the new status.                                                              |

## Checking it by hand

Every route except `/auth/login` needs a session, and `POST` needs at least the manager role,
so log in first and pass the cookie jar to `curl -b`:

```bash
# Log in as a manager (or admin) and save the session cookie
curl -s -c jar.txt -X POST localhost:4000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"manager@example.com","password":"<password>"}'

# 422: missing reference
curl -s -b jar.txt -X POST localhost:4000/api/v1/wells -H 'content-type: application/json' \
  -d '{"projectId":"0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b","name":"X","designation":"exploration",
       "spudDate":"2026-01-01","wellType":"Vertical","rigName":"R","rigType":"onshore"}'

# 404
curl -s -b jar.txt localhost:4000/api/v1/projects/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b

# 422: validation
curl -s -b jar.txt -X POST localhost:4000/api/v1/projects -H 'content-type: application/json' -d '{"name":""}'
```
