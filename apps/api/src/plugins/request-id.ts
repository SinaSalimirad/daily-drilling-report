import { Elysia } from 'elysia';

// docs/06-logging.md: reuse the X-Request-Id set by Nginx, or generate one.
// The id is keyed by the Request object, so the logger and the error handler
// (which also runs for unknown routes, before `derive`) read the same value.

export const REQUEST_ID_HEADER = 'x-request-id';
const VALID_ID = /^[A-Za-z0-9._-]{1,128}$/;
const ids = new WeakMap<Request, string>();

export function requestIdOf(request: Request): string {
  let id = ids.get(request);
  if (id === undefined) {
    const incoming = request.headers.get(REQUEST_ID_HEADER);
    id = incoming !== null && VALID_ID.test(incoming) ? incoming : crypto.randomUUID();
    ids.set(request, id);
  }
  return id;
}

export const requestId = new Elysia({ name: 'request-id' })
  .onRequest(({ request, set }) => {
    set.headers[REQUEST_ID_HEADER] = requestIdOf(request);
  })
  .derive({ as: 'global' }, ({ request }) => ({ requestId: requestIdOf(request) }));
