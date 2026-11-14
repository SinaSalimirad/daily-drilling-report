# Authentication and authorization

**Status: API done (milestone `v0.4.0`, access + refresh tokens added after it); web: login page and silent
refresh done, the rest not started.** Every route under `/api/v1`, except `POST /auth/login`, `POST /auth/token`,
`POST /auth/refresh` and `POST /auth/logout`, needs a valid access token, and every route states the minimum role it
needs. The web app has a login page (`/login`), but the dashboard does not check the session yet (see [Web](#web)),
so a logged-out user still gets `401` from every request.

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
`features/users/roles.ts`). A request without a valid access token gets `401`; a user below the
route's role gets `403`.

| Routes                                                        | `GET`  | `POST` / `PATCH` | `DELETE` |
| ------------------------------------------------------------- | ------ | ---------------- | -------- |
| `/reports`, `/inventories`                                    | viewer | reporter         | manager  |
| `/projects`, `/wells`, `/sections`, `/products`               | viewer | manager          | manager  |
| `/users`                                                      | admin  | admin            | (none)   |
| `/auth/me`                                                    | viewer |                  |          |
| `/auth/login`, `/auth/token`, `/auth/refresh`, `/auth/logout` |        | anyone           |          |

## Sessions and tokens

Email + password login. Passwords are hashed with Argon2id (`Bun.password.hash`). A login creates
a **session** (one row in `sessions`) and hands out two tokens:

|          | Access token                                                            | Refresh token                                                             |
| -------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| What     | JWT, HS256, signed with `JWT_SECRET` (`features/auth/access-token.ts`)  | 32 random bytes, base64url; only its SHA-256 is stored (`refresh_tokens`) |
| Claims   | `sub` (user id), `sid` (session id), `role`, `iss`, `aud`, `iat`, `exp` | none, it is opaque                                                        |
| Lifetime | `ACCESS_TOKEN_TTL_MINUTES` (15)                                         | `REFRESH_TOKEN_TTL_DAYS` (7), never past the session's `expires_at`       |
| Checked  | on every request, by signature only, **no database read**               | only by `POST /auth/refresh` and `POST /auth/logout`                      |
| Browser  | HttpOnly cookie `access_token`, `Path=/api`                             | HttpOnly cookie `refresh_token`, `Path=/api/v1/auth`                      |
| Desktop  | `Authorization: Bearer <token>`                                         | JSON body `{ refreshToken }`                                              |

Both cookies are `SameSite=Lax`, `Secure` when `NODE_ENV=production`, and never readable by page
scripts. The refresh cookie's path keeps it out of every request except refresh and logout. When a
bearer header and a cookie are both sent, the header wins (`readAccessToken` in
`plugins/auth-cookies.ts`).

### Lifetimes

- An access token expires after 15 minutes; the client then calls `POST /auth/refresh` and gets
  a new access **and** a new refresh token. The user notices nothing (see [Web](#web)).
- Each refresh token is valid for 7 days, so an active user stays logged in, and 7 days without
  any use end the session.
- `SESSION_MAX_AGE_DAYS` (30) after login the session ends however active it is; refreshing
  never moves that date. Then the user logs in again.

### Rotation and reuse detection

`rotateRefreshToken` in `features/auth/sessions.service.ts`, in one transaction that locks the
token row (`SELECT … FOR UPDATE`), so two requests with the same token can't both rotate it:

1. Unknown token, expired token, revoked or expired session, inactive user: `401`.
2. Valid and unused: it gets `rotated_at`, a new refresh token is inserted in the same session, and
   a new access token is signed with the role **read from the database**, so a role change reaches
   the client at its next refresh.
3. Already used (`rotated_at` set). The real client only ever sends the newest token of its chain,
   so an old one coming back means two parties hold the chain:
   - within `REFRESH_REUSE_GRACE_SECONDS` (10) of the rotation it is a race between two tabs or
     requests: `409 { code: "refresh-race" }`, nothing is revoked, the client retries its request
     with the cookies the other request got;
   - later it is treated as **theft**: every session of the user is revoked
     (`revoke_reason = 'refresh-token-reuse'`), the cookies are cleared, the API answers `401` and
     writes one log line `{"level":"warn","event":"refresh-token-reuse","userId":…,"sessionId":…}`
     (never the token). Search the API log for `refresh-token-reuse` to find these. Both the thief
     and the user have to log in again; only the user knows the password.
   - if the session was already revoked, the API only answers `401`, so someone replaying an old
     token can't log the user out again and again.

### Revocation and its limit

**Logout** revokes the session of the refresh token (cookie or body), or else of a valid access
token's `sid`, and clears both cookies. **Login** revokes the session the client already had
(session rotation). **Deactivating a user or changing their password** revokes all of their
sessions in the same transaction as the change. `sessions.revoke_reason` records why.

Revoking a session stops its **refresh** tokens at once. An access token is a JWT and is not
checked against the database, so one that was already issued **keeps working until it expires,
at most `ACCESS_TOKEN_TTL_MINUTES`**. That is the price of stateless access tokens; lower the TTL
to shrink the window. `GET /auth/me` does read the database and refuses a deactivated user at
once. Changing `JWT_SECRET` invalidates every access token; clients then refresh silently.

Login creates its session in a transaction that locks the user row and checks the password hash
and `is_active` again, so a login racing a password change can't leave a session behind.

## Tables

`users` (`features/users/users.schema.ts`), `sessions` and `refresh_tokens`
(`features/auth/sessions.schema.ts`):

```
users           id, email (unique; a check keeps it lower-case), password_hash, display_name,
                role (viewer | reporter | manager | admin, default viewer), is_active,
                email_verified_at, created_at, updated_at
sessions        id, user_id -> users (on delete cascade), expires_at (login + 30 d),
                revoked_at, revoke_reason (logout | replaced-by-login | refresh-token-reuse |
                password-change | deactivated), created_at; index on user_id
refresh_tokens  id, session_id -> sessions (on delete cascade), token_hash (unique),
                expires_at, rotated_at, created_at; index on session_id
```

A session is one login; every refresh token issued since then is a row of `refresh_tokens`
pointing at it (a "token family"). Used tokens are kept, because one coming back is how theft is
noticed. Access tokens are not stored at all.

Emails are trimmed and lower-cased by the zod schema before they reach the database, so
`A@x.com` and `a@x.com` are the same account.

### Email verification (until v1.1.0)

There is no mail service yet, so **every user is created with `email_verified_at` set to the
creation time** (see the `TODO(v1.1.0)` in `users.service.ts`). Login already refuses a user whose
`email_verified_at` is `NULL` (`403`), so v1.1.0 only has to stop setting it on create, send a
verification link, and set it when the link is opened.

## API

| Route                                        | Purpose                                                                                                                                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/login`                    | body `{ email, password }`; sets both cookies, returns the user. Wrong password, unknown email and a deactivated account all get the same `401 { message: "Invalid email or password." }`                |
| `POST /api/v1/auth/token`                    | desktop app. Same body and errors as `/auth/login`; returns `{ user, accessToken, accessExpiresAt, refreshToken, refreshExpiresAt }` and sets no cookie. Shares the login rate limit                     |
| `POST /api/v1/auth/refresh`                  | body `{}` (browser, token from the cookie: new cookies, returns the expiry dates) or `{ refreshToken }` (desktop: returns the new pair). `401 { code: "session-ended" }`, `409 { code: "refresh-race" }` |
| `POST /api/v1/auth/logout`                   | body `{}` or `{ refreshToken }`; revokes the session, clears both cookies; works without a session too                                                                                                   |
| `GET /api/v1/auth/me`                        | the current user from the database; `401` without a valid access token or for a deactivated user                                                                                                         |
| `GET /api/v1/users`, `GET /api/v1/users/:id` | list / one user (admin)                                                                                                                                                                                  |
| `POST /api/v1/users`                         | body `{ email, password, displayName, role? }` (admin). Duplicate email is `409`                                                                                                                         |
| `PATCH /api/v1/users/:id`                    | any of `{ displayName, role, isActive, password }` (admin). An admin can't change their own `role` or `isActive` (`403`), so the last admin can't lock everyone out                                      |

A user is always returned without `password_hash`: services select `publicUserColumns` only.
Users can't sign themselves up; an admin creates them. **The first admin** is created from the
command line:

```bash
ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='...' ADMIN_DISPLAY_NAME='Me' bun run db:create-admin
```

### How a route declares its role

`plugins/auth.plugin.ts` is an Elysia plugin with a **macro**: every instance that uses it gets
a `role` route option. It reads the access token from the bearer header or the cookie, verifies
the JWT (no database read), answers `401`/`403`, and otherwise passes a typed
`user = { id, role, sessionId }` to the handler. An expired token gets
`401 { code: "token-expired" }`, so a client knows to refresh.

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
  shared by `/auth/login` and `/auth/token`. `/auth/refresh` has `RATE_LIMIT_REFRESH_MAX`
  (default 30).
- The login routes and `/auth/refresh` require `Content-Type: application/json` (`415`
  otherwise, before body validation). A cross-site form can't send JSON, so another site can't
  log a browser into an account of its choosing.
- `JWT_SECRET` is required (at least 32 characters, no default): `openssl rand -base64 48`.
  Anyone who has it can sign an access token for any user and role, so keep it out of the repo
  and the logs.
- When the email is unknown, login still verifies the password against a dummy hash, so the
  response time does not reveal which emails have an account.
- Errors follow [error-flow.md](error-flow.md): `401 { message }`, `403 { message }`.
- The request log line gets the user id (a logixlysia `enricher`), never a token or the
  password. Queries that carry a password hash hide their parameters from the error log.
  See [logging.md](logging.md).
- CORS sends `Access-Control-Allow-Credentials: true`, so a web app on another origin in
  development (`localhost:3000` → `:4000`) can send the cookie. Behind nginx CORS is off anyway,
  except for the desktop app: add its webview origins,
  `CORS_ORIGINS=tauri://localhost,http://tauri.localhost`. `Authorization` is already an allowed
  header.

## Tests

- Unit: `roles.test.ts`, `access-token.test.ts` (expiry, tampered payload, `alg: none`, other
  secret), `refresh-token.test.ts`, `users.schema.test.ts`, `env.test.ts`; web:
  `lib/axios.test.ts` (one shared refresh, retry once, 409, no refresh for login).
- Database (real Postgres, skipped unless `TEST_DATABASE_URL` is set; CI sets it):
  `auth.routes.test.ts` (login, cookie flags and paths, `/auth/token`, bearer header, expired
  access token, logout, rotation on login),
  `refresh.routes.test.ts` (rotation, 30-day cap, grace window, two parallel refreshes, reuse
  detection ending every session, replay not ending later sessions, expiry),
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
Login sets the cookies, puts the returned user in the `["auth", "me"]` query cache and goes to
`/dashboard`. Success and failure are sonner toasts; the failure text comes from the status code (`loginErrorMessage`).
`src/lib/axios.ts` sends `withCredentials: true`.

**Silent refresh** (`src/lib/axios.ts`): when a request gets `401` (except the auth routes
themselves), the interceptor calls `POST /auth/refresh` and repeats the request once. Requests of
one tab that fail together share one refresh; across tabs a Web Lock (`navigator.locks`,
`auth-refresh`) makes them take turns, so two tabs never send the same refresh token at once
(the server's grace window and `409` are the fallback). If the refresh fails, the page goes to
`/login` with a full load, which also empties the query cache.

**Not started:**

- The dashboard layout calls `GET /auth/me`
  (TanStack Query, key `["auth", "me"]`) and redirects to `/login` on `401`.
- A `useCan(role)` hook over the `me` query; the action menus hide "Delete …" for users below
  manager and the "Add …" buttons for viewers. This is convenience only; the API is the gate.
- Show the current user and a logout button in the sidebar header (today it is a static
  "Documentation v1.0.0" block).
- A users page for admins over `/users`.

## Desktop app

**Not started.** API side done (above). The Tauri app will load the same web UI; what it still needs:

- Log in through `POST /auth/token` instead of `/auth/login` and store both tokens in the OS
  keychain (a Tauri secure-storage plugin), never `localStorage`.
- An axios request interceptor in `src/lib/axios.ts` that adds `Authorization: Bearer <access>`
  when running inside Tauri, and a refresh that sends `{ refreshToken }` in the body and stores
  the new pair **before** using it (losing the new refresh token means the next refresh looks
  like reuse). Delete both tokens on logout or when the refresh answers `401`.
- The web build must work as a static export (no server-only Next.js features), because Tauri
  serves files, not a Node server.

## Out of scope for now

Single sign-on / OAuth, two-factor authentication, self sign-up, password reset by email (no
mail server in the stack yet; an admin sets a new password), per-project permissions (a user sees
all projects). Email verification is planned for `v1.1.0` (see above).

## Follow-ups

- Revoked and expired `sessions` rows (and, through the cascade, their `refresh_tokens`) are
  never deleted; add a periodic cleanup, e.g. sessions that ended more than 30 days ago. Keep
  them a while first: they are the record of when and why a session ended.
- Notify the user (or an admin) on `refresh-token-reuse`; today it is only a log line.
- If the 15-minute window after revocation is ever too long, add a small denylist of revoked
  `sid`s checked by `auth.plugin.ts`, or lower `ACCESS_TOKEN_TTL_MINUTES`.
- `GET /users` is not paginated, like every other list today.
- `created_by` / `updated_by` audit columns are possible now that users exist.
