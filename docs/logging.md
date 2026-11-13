# Logging

Everything logs to **stdout/stderr**. Nothing is written to files by the apps; in the Docker
stack the container runtime keeps the output (`podman logs api`, `podman logs nginx`).

```
Browser ──► nginx (access log, one line per request) ──► api (logixlysia, one line per request)
                                                          └─ X-Request-Id on every response
```

## API (`apps/api`)

The API uses [logixlysia](https://github.com/PunGrumpy/logixlysia), configured in
`src/plugins/logixlysia.plugin.ts` and registered in `src/index.ts` **before** the db-errors
plugin and the routes, so every request is logged, including the ones that fail.

### What a line contains

```
2026-11-13T18:26:50.337Z 🦊 GET     /api/v1/products 200 23ms
  └─ requestId  ef798c19-f2ca-4ce1-a20d-f5d70bd9d309
```

Method, path, status, duration and the request id. Durations are coloured in development
(green under 500 ms, red at 1 s and above). Query strings are **not** logged.

### Request ids

`requestId: true` makes the plugin:

1. read an incoming `X-Request-Id` header and keep it when it is 1–128 characters of
   `A-Z a-z 0-9 . _ -`, otherwise
2. generate a UUID,
3. put it in the log line and set it on the response as `X-Request-Id`.

When a user reports a problem, ask for the id from the failing response (visible in the browser's
network tab) and search the API log for it. nginx does not set the header today; if it should
(so one id also appears in the nginx access log), add
`proxy_set_header X-Request-Id $request_id;` and `$request_id` to the nginx `log_format`.

### Levels and format by environment

| `NODE_ENV` | Level | Format |
| --- | --- | --- |
| `development` (default) | `debug` | pretty, coloured, local time `HH:MM:ss` |
| `test`, `production` | `info` | plain, one line per record, no ANSI codes |

The switch is `env.NODE_ENV === "development"` in the plugin config. Containers set
`NODE_ENV=production` in the Dockerfile and in `infra/docker/compose.dev.yml`.

### What is not logged

- Request bodies and validation payloads (`logErrorPayload` is off). Bodies routinely contain
  what should not be in a log.
- Database query text. Drizzle's query logger is off; enable it locally with
  `drizzle(pool, { logger: true })` in `src/db/index.ts` when debugging a query, and do not
  commit it.
- The seed script (`src/db/seed.ts`) uses `console.log` / `console.error` because it is a
  one-shot CLI, not part of the server.

### Errors

Errors mapped by `plugins/db-errors.plugin.ts` (409 / 422) and `NotFoundError` (404) appear as
normal request lines with their status. Unhandled errors (500) are logged by Elysia with the
stack trace. See [error-flow.md](error-flow.md) for the mapping.

## nginx (`infra/nginx`)

- `nginx.dev.conf`: `access_log /dev/stdout dev` with the format
  `remote_addr … "request" status bytes "referer" "user_agent" rt= urt= upstream=`; errors at
  `notice` level to stderr.
- `nginx.prod.conf`: the same without the upstream address, errors at `warn`; `server_tokens off`.
- `rt` is the total request time, `urt` the time the upstream (api or web) took. A large gap
  between them points at nginx or the network, not the app.

## Web (`apps/web`)

The browser bundle logs only through the axios response interceptor in `src/lib/axios.ts`:
`API error: <status>`, `Network error: no response received` or `Request setup error: …` to the
browser console. Next.js itself logs requests to the terminal in development. Users see
failures as messages in the form or as toasts, never as raw log output.

## Rate limiting and logging

A request rejected by the rate limiter (429) is still logged as a request line, with the
client IP taken from `X-Real-IP` / `X-Forwarded-For` (set by nginx) or the socket address.
If the API ever runs without nginx in front, those headers can be spoofed; the generator is in
`src/plugins/rate-limit.plugin.ts`.

## Changing the configuration

| Want | Do |
| --- | --- |
| Quieter development output | lower `pino.level` to `"info"` in the plugin config |
| Ship logs to a collector | add a `transports: [...]` entry (logixlysia supports custom transports) or let the container runtime forward stdout |
| Redact values (emails, tokens) | set `autoRedact: true`; extend `redactKeys` / `redactPatterns` for app-specific shapes |
| Log slow queries | Drizzle logger as above, or wrap the service call and log when it exceeds a threshold |

Keep the config in one file (`logixlysia.plugin.ts`); routes and services should not call the
logger directly for request lines, only for domain events that the request line cannot express.
