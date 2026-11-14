# Authentication and authorization

**Status: API done (milestone `v0.4.0`); web not started.** Every route under `/api/v1`, except
`POST /auth/login` and `POST /auth/logout`, needs a logged-in user, and every route states the
minimum role it needs. The web app has no login page yet, so until the [Web](#web-not-started)
part is built the dashboard gets `401` from every request.

## Goals

1. Users must log in before they can use the dashboard or the API.
2. Permissions are enforced **by the API**, never only by hiding buttons in the web app.
3. A normal user cannot delete master data; only a manager (or higher) can.
4. It works behind nginx on one origin, and stays simple to run (no external identity provider).

## Roles

| Role | Can |
| --- | --- |
| `viewer` | Read everything |
| `reporter` | Everything a viewer can, plus create and edit **reports** and **inventories** |
| `manager` | Everything a reporter can, plus create, edit and **delete** projects, wells, sections, products, reports and inventories |
| `admin` | Everything a manager can, plus manage users and roles |

Roles are ordered; a check is always "at least `<role>`" (`hasRole` in
`features/users/roles.ts`). A request without a valid session gets `401`; a user below the
route's role gets `403`.

| Routes | `GET` | `POST` / `PATCH` | `DELETE` |
| --- | --- | --- | --- |
| `/reports`, `/inventories` | viewer | reporter | manager |
| `/projects`, `/wells`, `/sections`, `/products` | viewer | manager | manager |
| `/users` | admin | admin | (none) |
| `/auth/me` | viewer | | |
| `/auth/login`, `/auth/logout` | | anyone | |

## Sessions

- Email + password login. Passwords are hashed with Argon2id (`Bun.password.hash`); no extra
  dependency.
- On login the API creates a random 32-byte token (base64url) and sends it in an **HttpOnly,
  SameSite=Lax cookie** named `session` (`Secure` when `NODE_ENV=production`). The web app and
  the API share one origin through nginx, so the browser sends it with every `/api` request.
- The `sessions` table stores only the **SHA-256 of the token** (`token_hash`), never the token
  itself, so a copy of the database can't be used to log in. A fast hash is enough because the
  token is random; Argon2 is only needed for passwords, which people choose.
- A session is valid while all of these hold, checked in one SQL query on every request
  (`findUserBySessionToken` in `features/auth/sessions.service.ts`):
  - `revoked_at IS NULL`
  - `expires_at > now`: absolute limit, `SESSION_MAX_AGE_DAYS` (default 30) after login
  - `last_seen_at` is newer than `SESSION_IDLE_HOURS` (default 12): the inactivity limit.
    `last_seen_at` is refreshed at most every 5 minutes, so the limit is accurate to about 5 minutes
  - the user is still `is_active`
- **Logout** sets `revoked_at` and clears the cookie. **Login** revokes the session the browser
  already had, if any (session rotation).
- **Deactivating a user or changing their password** revokes all of their sessions, in the same
  transaction as the change.
- No JWT: an opaque session can be revoked at once, which matters more here than statelessness.
  If a machine client ever needs the API, add an API-key table later.

## Tables

`users` (`features/users/users.schema.ts`) and `sessions` (`features/auth/sessions.schema.ts`):

```
users     id, email (unique; a check keeps it lower-case), password_hash, display_name,
          role (viewer | reporter | manager | admin, default viewer), is_active,
          email_verified_at, created_at, updated_at
sessions  id, user_id -> users (on delete cascade), token_hash (unique), expires_at,
          last_seen_at, revoked_at, created_at; index on user_id
```

Emails are trimmed and lower-cased by the zod schema before they reach the database, so
`A@x.com` and `a@x.com` are the same account.

### Email verification (until v1.1.0)

There is no mail service yet, so **every user is created with `email_verified_at` set to the
creation time** (see the `TODO(v1.1.0)` in `users.service.ts`). Login already refuses a user whose
`email_verified_at` is `NULL` (`403`), so v1.1.0 only has to stop setting it on create, send a
verification link, and set it when the link is opened.

## API

| Route | Purpose |
| --- | --- |
| `POST /api/v1/auth/login` | body `{ email, password }`; sets the cookie, returns the user. Wrong password, unknown email and a deactivated account all get the same `401 { message: "Invalid email or password." }` |
| `POST /api/v1/auth/logout` | revokes the session, clears the cookie; works without a session too |
| `GET /api/v1/auth/me` | the current user and role; `401` without a valid session |
| `GET /api/v1/users`, `GET /api/v1/users/:id` | list / one user (admin) |
| `POST /api/v1/users` | body `{ email, password, displayName, role? }` (admin). Duplicate email is `409` |
| `PATCH /api/v1/users/:id` | any of `{ displayName, role, isActive, password }` (admin). An admin can't change their own `role` or `isActive` (`403`), so the last admin can't lock everyone out |

A user is always returned without `password_hash`: services select `publicUserColumns` only.
Users can't sign themselves up; an admin creates them. **The first admin** is created from the
command line:

```bash
ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='...' ADMIN_DISPLAY_NAME='Me' bun run db:create-admin
```

### How a route declares its role

`plugins/auth.plugin.ts` is an Elysia plugin with a **macro**: every instance that uses it gets
a `role` route option. It reads the cookie, loads the user, answers `401`/`403`, and otherwise
passes a typed `user` to the handler.

```ts
const writeRoutes = new Elysia()
  .use(authPlugin)
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createReportBody, role: Role.Reporter })
  .delete("/:id", ({ params }) => service.remove(params.id), {
    params: reportIdParams,
    role: Role.Manager,
  });
```

The role is written on each route rather than once per group, because in reports and
inventories the write and the delete need different roles.

The check runs after body/params validation, so an anonymous request with an invalid body gets
`422` before `401`. That reveals nothing the OpenAPI page doesn't already show.

### Other details

- Login has its own rate limit, `RATE_LIMIT_LOGIN_MAX` (default 5) per window per client IP.
- When the email is unknown, login still verifies the password against a dummy hash, so the
  response time does not reveal which emails have an account.
- Errors follow [error-flow.md](error-flow.md): `401 { message }`, `403 { message }`.
- The request log line gets the user id (a logixlysia `enricher`), never the session token or
  the password. Queries that carry a password hash hide their parameters from the error log.
  See [logging.md](logging.md).
- CORS sends `Access-Control-Allow-Credentials: true`, so a web app on another origin in
  development (`localhost:3000` → `:4000`) can send the cookie. Behind nginx CORS is off anyway.

## Tests

- Unit: `roles.test.ts`, `session-token.test.ts`, `users.schema.test.ts`, `env.test.ts`.
- Database (real Postgres, skipped unless `TEST_DATABASE_URL` is set; CI sets it):
  `auth.routes.test.ts` (login, cookie flags, expiry, idle timeout, logout, rotation),
  `users.routes.test.ts` (admin only, revocation on deactivate / new password, self-demotion),
  and `apps/api/test/permissions.test.ts`, which checks for **every feature** that an anonymous
  request gets `401`, a viewer can read, a role below the write role gets `403` and the write role
  gets past the check, and only a manager gets past the delete check.

```bash
TEST_DATABASE_URL=postgres://postgres:<password>@localhost:5432/daily_drilling_report_test bun run test
```

The database name must end in `_test` (`test/preload.ts` refuses anything else), because the
tests empty every table. The preload applies the migrations.

## Web (not started)

- A `(auth)/login` route outside the dashboard layout. The dashboard layout calls `GET /auth/me`
  (TanStack Query, key `["auth", "me"]`) and redirects to `/login` on `401`.
- The axios instance has a request interceptor placeholder in `src/lib/axios.ts`; with cookies
  it only needs `withCredentials: true` when web and api run on different ports in development.
  Behind nginx nothing is needed.
- A response interceptor that, on `401`, clears the `me` query and sends the user to `/login`.
- A `useCan(role)` hook over the `me` query; the action menus hide "Delete …" for users below
  manager and the "Add …" buttons for viewers. This is convenience only; the API is the gate.
- Show the current user and a logout button in the sidebar header (today it is a static
  "Documentation v1.0.0" block).
- A users page for admins over `/users`.

## Out of scope for now

Single sign-on / OAuth, two-factor authentication, self sign-up, password reset by email (no
mail server in the stack yet; an admin sets a new password), per-project permissions (a user sees
all projects). Email verification is planned for `v1.1.0` (see above).

## Follow-ups

- Revoked and expired `sessions` rows are never deleted; add a periodic cleanup
  (`DELETE ... WHERE revoked_at IS NOT NULL OR expires_at < now()`).
- `GET /users` is not paginated, like every other list today.
- `created_by` / `updated_by` audit columns are possible now that users exist.
