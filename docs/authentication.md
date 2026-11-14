# Authentication and authorization

**Status: API done (milestone `v0.4.0`); web: login page done, the rest not started.** Every route under `/api/v1`, except
`POST /auth/login`, `POST /auth/token` and `POST /auth/logout`, needs a logged-in user, and every route states the
minimum role it needs. The web app has a login page (`/login`), but the dashboard does not check the session yet (see
[Web](#web)), so a logged-out user still gets `401` from every request.

## Goals

1. Users must log in before they can use the dashboard or the API.
2. Permissions are enforced **by the API**, never only by hiding buttons in the web app.
3. A normal user cannot delete master data; only a manager (or higher) can.
4. It works behind nginx on one origin, and stays simple to run (no external identity provider).
5. The planned desktop app (Tauri) uses the same accounts and sessions as the browser.

## Roles

| Role       | Can                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `viewer`   | Read everything                                                                                                          |
| `reporter` | Everything a viewer can, plus create and edit **reports** and **inventories**                                            |
| `manager`  | Everything a reporter can, plus create, edit and **delete** projects, wells, sections, products, reports and inventories |
| `admin`    | Everything a manager can, plus manage users and roles                                                                    |

Roles are ordered; a check is always "at least `<role>`" (`hasRole` in
`features/users/roles.ts`). A request without a valid session gets `401`; a user below the
route's role gets `403`.

| Routes                                          | `GET`  | `POST` / `PATCH` | `DELETE` |
| ----------------------------------------------- | ------ | ---------------- | -------- |
| `/reports`, `/inventories`                      | viewer | reporter         | manager  |
| `/projects`, `/wells`, `/sections`, `/products` | viewer | manager          | manager  |
| `/users`                                        | admin  | admin            | (none)   |
| `/auth/me`                                      | viewer |                  |          |
| `/auth/login`, `/auth/token`, `/auth/logout`    |        | anyone           |          |

## Sessions

- Email + password login. Passwords are hashed with Argon2id (`Bun.password.hash`); no extra
  dependency.
- On login the API creates a random 32-byte token (base64url) and sends it in an **HttpOnly,
  SameSite=Lax cookie** named `session` (`Secure` when `NODE_ENV=production`). The web app and
  the API share one origin through nginx, so the browser sends it with every `/api` request.
- **Desktop app (Tauri):** its webview runs on another origin (`tauri://localhost`,
  `http://tauri.localhost` on Windows), so the cookie is not usable. It logs in with
  `POST /auth/token`, which returns the same kind of token **in the body** and sets no cookie.
  The app keeps it in the OS keychain (never `localStorage`) and sends it as
  `Authorization: Bearer <token>`. Every route accepts either; when both are sent the header
  wins (`readRequestToken` in `plugins/session-cookie.ts`). It is the same `sessions` row, so
  expiry, idle timeout, logout and revocation work exactly as for the cookie.
- The `sessions` table stores only the **SHA-256 of the token** (`token_hash`), never the token
  itself, so a copy of the database can't be used to log in. A fast hash is enough because the
  token is random; Argon2 is only needed for passwords, which people choose.
- A session is valid while all of these hold, checked in one SQL query on every request
  (`findUserBySessionToken` in `features/auth/sessions.service.ts`):
  - `revoked_at IS NULL`
  - `expires_at > now`: absolute limit, `SESSION_MAX_AGE_DAYS` (default 30) after login
  - `last_seen_at` is newer than `SESSION_IDLE_HOURS` (default 12): the inactivity limit.
    `last_seen_at` is refreshed at most every 5 minutes (or half the idle timeout, if that is
    shorter), so the limit is accurate to about 5 minutes
  - the user is still `is_active`
- **Logout** sets `revoked_at` for the cookie or bearer token and clears the cookie. **Login**
  revokes the session the client already had, if any (session rotation): the cookie for
  `/auth/login`, the bearer token for `/auth/token`.
- **Deactivating a user or changing their password** revokes all of their sessions, in the same
  transaction as the change. Login creates its session in a transaction that locks the user row
  and checks the password hash and `is_active` again, so a login racing a password change can't
  leave a session behind.
- No JWT and no refresh tokens: an opaque session can be revoked at once, which matters more
  here than statelessness, and every request checks the database anyway. The desktop app uses
  the same opaque token, only carried in a header. If a machine client ever needs the API, add
  an API-key table later.

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

| Route                                        | Purpose                                                                                                                                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/login`                    | body `{ email, password }`; sets the cookie, returns the user. Wrong password, unknown email and a deactivated account all get the same `401 { message: "Invalid email or password." }` |
| `POST /api/v1/auth/token`                    | desktop app. Same body and errors as `/auth/login`; returns `{ user, token, expiresAt }` and sets no cookie. Shares the login rate limit                                                |
| `POST /api/v1/auth/logout`                   | revokes the session (cookie or bearer), clears the cookie; works without a session too                                                                                                  |
| `GET /api/v1/auth/me`                        | the current user and role; `401` without a valid session                                                                                                                                |
| `GET /api/v1/users`, `GET /api/v1/users/:id` | list / one user (admin)                                                                                                                                                                 |
| `POST /api/v1/users`                         | body `{ email, password, displayName, role? }` (admin). Duplicate email is `409`                                                                                                        |
| `PATCH /api/v1/users/:id`                    | any of `{ displayName, role, isActive, password }` (admin). An admin can't change their own `role` or `isActive` (`403`), so the last admin can't lock everyone out                     |

A user is always returned without `password_hash`: services select `publicUserColumns` only.
Users can't sign themselves up; an admin creates them. **The first admin** is created from the
command line:

```bash
ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='...' ADMIN_DISPLAY_NAME='Me' bun run db:create-admin
```

### How a route declares its role

`plugins/auth.plugin.ts` is an Elysia plugin with a **macro**: every instance that uses it gets
a `role` route option. It reads the bearer header or the cookie, loads the user, answers `401`/`403`, and otherwise
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

- Login has its own rate limit, `RATE_LIMIT_LOGIN_MAX` (default 5) per window per client IP,
  shared by `/auth/login` and `/auth/token`.
- Both login routes require `Content-Type: application/json` (`415` otherwise). A cross-site
  form can't send JSON, so another site can't log a browser into an account of its choosing.
- When the email is unknown, login still verifies the password against a dummy hash, so the
  response time does not reveal which emails have an account.
- Errors follow [error-flow.md](error-flow.md): `401 { message }`, `403 { message }`.
- The request log line gets the user id (a logixlysia `enricher`), never the session token or
  the password. Queries that carry a password hash hide their parameters from the error log.
  See [logging.md](logging.md).
- CORS sends `Access-Control-Allow-Credentials: true`, so a web app on another origin in
  development (`localhost:3000` → `:4000`) can send the cookie. Behind nginx CORS is off anyway,
  except for the desktop app: add its webview origins,
  `CORS_ORIGINS=tauri://localhost,http://tauri.localhost`. `Authorization` is already an allowed
  header.

## Tests

- Unit: `roles.test.ts`, `session-token.test.ts`, `users.schema.test.ts`, `env.test.ts`.
- Database (real Postgres, skipped unless `TEST_DATABASE_URL` is set; CI sets it):
  `auth.routes.test.ts` (login, cookie flags, `/auth/token`, bearer header, expiry, idle timeout,
  logout, rotation),
  `users.routes.test.ts` (admin only, revocation on deactivate / new password, self-demotion),
  and `apps/api/test/permissions.test.ts`, which checks for **every feature** that an anonymous
  request gets `401`, a viewer can read, a role below the write role gets `403` and the write role
  gets past the check, and only a manager gets past the delete check.

```bash
TEST_DATABASE_URL=postgres://postgres:<password>@localhost:5432/daily_drilling_report_test bun run test
```

The database name must end in `_test` (`test/preload.ts` refuses anything else), because the
tests empty every table. The preload applies the migrations.

## Web

**Done:** `app/(auth)/login` (outside the dashboard layout) renders `features/auth` `LoginForm`.
Login sets the cookie, puts the returned user in the `["auth", "me"]` query cache and goes to
`/dashboard`. Failures show a message chosen from the status code (`loginErrorMessage`).
`src/lib/axios.ts` sends `withCredentials: true`.

**Not started:**

- The dashboard layout calls `GET /auth/me`
  (TanStack Query, key `["auth", "me"]`) and redirects to `/login` on `401`.
- A response interceptor that, on `401`, clears the `me` query and sends the user to `/login`.
- A `useCan(role)` hook over the `me` query; the action menus hide "Delete …" for users below
  manager and the "Add …" buttons for viewers. This is convenience only; the API is the gate.
- Show the current user and a logout button in the sidebar header (today it is a static
  "Documentation v1.0.0" block).
- A users page for admins over `/users`.

## Desktop app

**Not started.** API side done (above). The Tauri app will load the same web UI; what it still needs:

- Log in through `POST /auth/token` instead of `/auth/login`, store the token in the OS keychain
  (a Tauri secure-storage plugin), and delete it on logout or on any `401`.
- An axios request interceptor in `src/lib/axios.ts` that adds `Authorization: Bearer <token>`
  when running inside Tauri.
- The web build must work as a static export (no server-only Next.js features), because Tauri
  serves files, not a Node server.

## Out of scope for now

Single sign-on / OAuth, two-factor authentication, self sign-up, password reset by email (no
mail server in the stack yet; an admin sets a new password), per-project permissions (a user sees
all projects). Email verification is planned for `v1.1.0` (see above).

## Follow-ups

- Revoked and expired `sessions` rows are never deleted; add a periodic cleanup
  (`DELETE ... WHERE revoked_at IS NOT NULL OR expires_at < now()`).
- `GET /users` is not paginated, like every other list today.
- `created_by` / `updated_by` audit columns are possible now that users exist.
