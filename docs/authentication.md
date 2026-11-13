# Authentication and authorization

**Status: not implemented.** Today every route under `/api/v1` is open to anyone who can reach
the API, and the web app has no login. This document fixes the design so the work in roadmap
milestone `v0.4.0` has a target, and lists the places in the current code that were left ready
for it.

## Goals

1. Users must log in before they can use the dashboard or the API.
2. Permissions are enforced **by the API**, never only by hiding buttons in the web app.
3. A normal user cannot delete master data; only a manager (or higher) can.
4. It works behind nginx on one origin, and stays simple to run (no external identity provider
   for the first version).

## Roles

| Role | Can |
| --- | --- |
| `viewer` | Read everything |
| `reporter` | Everything a viewer can, plus create and edit **reports** and **inventories** |
| `manager` | Everything a reporter can, plus create, edit and **delete** projects, wells, sections, products, reports and inventories |
| `admin` | Everything a manager can, plus manage users and roles |

Roles are ordered; a check is "at least `<role>`". The first rule to implement is the one that
was already noted as missing: **`DELETE /api/v1/products/:id` (and every other delete) requires
at least `manager`**; a user below that gets `403`, an anonymous request `401`.

## Design

### Sessions

- Email + password login. Passwords hashed with Argon2id (`Bun.password.hash` /
  `Bun.password.verify`, no extra dependency).
- A server-side session stored in Postgres (`sessions` table: id, user id, expiry, created at),
  referenced by an opaque random id in an **HttpOnly, Secure, SameSite=Lax cookie**. The web app
  and the API share the origin through nginx, so a cookie needs no CORS work and the browser
  sends it with every `/api` request. Rotate the id on login; delete the row on logout.
- Sessions expire after inactivity (for example 12 hours) and have an absolute limit (for example
  30 days). A cleanup job or a `WHERE expires_at > now()` on every lookup is enough.
- No JWT for the browser: an opaque session can be revoked immediately, which matters more here
  than statelessness. If a machine client ever needs the API, add an API-key table later.

### Tables (feature `auth` in `apps/api/src/features/auth/`)

```
users     id, email (unique, lower-cased), password_hash, display_name, role, is_active, timestamps
sessions  id (random 32 bytes, base64url), user_id -> users, expires_at, created_at, last_seen_at
```

The first admin is created by a seed or CLI command, not through the API.

### API

| Route | Purpose |
| --- | --- |
| `POST /api/v1/auth/login` | body `{ email, password }`; sets the cookie, returns the user (no hash) |
| `POST /api/v1/auth/logout` | deletes the session, clears the cookie |
| `GET /api/v1/auth/me` | the current user and role, `401` without a valid session |
| `GET/POST/PATCH /api/v1/users` | admin only |

Plumbing, as Elysia plugins in `apps/api/src/plugins/`:

- `auth.plugin.ts`: reads the cookie, loads the session and user, puts `user` on the context
  (`derive`), and exposes two guards: `requireUser()` (→ `401`) and `requireRole("manager")`
  (→ `403`). Guards are applied per route group, e.g. the `writeRoutes` instance that already
  exists in every `*.routes.ts` (it currently only adds the write rate limit) gets
  `requireRole("reporter")` for reports and inventories and `requireRole("manager")` elsewhere;
  the `.delete` routes get `requireRole("manager")`.
- Login is rate limited harder than other writes (same `elysia-rate-limit`, small `max`).
- Errors follow [error-flow.md](error-flow.md): `401 { message }`, `403 { message }`.
- Log the user id in the request line (logixlysia `enrichers`), never the session id or
  password. See [logging.md](logging.md).

### Web

- A `(auth)/login` route outside the dashboard layout. The dashboard layout calls `GET /auth/me`
  (TanStack Query, key `["auth", "me"]`) and redirects to `/login` on `401`.
- The axios instance already has a request interceptor placeholder in `src/lib/axios.ts`; with
  cookies it only needs `withCredentials: true` when web and api run on different ports in
  development. Behind nginx nothing is needed.
- A response interceptor that, on `401`, clears the `me` query and sends the user to `/login`.
- A `useCan(role)` hook over the `me` query; the action menus hide "Delete …" for users below
  manager and the "Add …" buttons for viewers. This is convenience only; the API is the gate.
- Show the current user and a logout button in the sidebar header (today it is a static
  "Documentation v1.0.0" block).

### Already in place

- CORS allows the `Authorization` header (`plugins/cors.plugin.ts`), in case a bearer token is
  used by non-browser clients later.
- Every feature already splits reads from `writeRoutes`, so role guards attach in one place per
  feature.
- `X-Request-Id` on every response, so a `401`/`403` a user reports can be found in the log.

## Out of scope for the first version

Single sign-on / OAuth, two-factor authentication, password reset by email (no mail server in
the stack yet; an admin resets passwords), per-project permissions (a user sees all projects).
Revisit when the roadmap reaches `v1.0.0-rc.1`.

## Definition of done (milestone `v0.4.0`)

- Login, logout and `me` work in the web app; the dashboard is unreachable without a session.
- Every write route checks a role; every delete requires `manager`. Tests cover `401`, `403`
  and the allowed case for at least one route per feature.
- Passwords are never logged or returned. Session cookie is HttpOnly and Secure in production.
- This document is updated to describe what was built, not what was planned.
