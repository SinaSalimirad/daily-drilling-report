import { Elysia } from 'elysia';
import { ForbiddenError } from '../lib/errors';

// docs/07 checklist (CSRF): state-changing requests are accepted only from the application's
// own origin. A browser always sends `Origin` on them; a request that carries a cookie but no
// `Origin` is refused as well. The better-auth routes check their own trusted origins.

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export const originCheck = (allowed: string) =>
  new Elysia({ name: 'origin-check' }).onRequest(({ request }) => {
    if (SAFE.has(request.method)) return;
    if (new URL(request.url).pathname.startsWith('/api/auth/')) return;
    const origin = request.headers.get('origin');
    if (origin ? origin !== allowed : request.headers.has('cookie')) {
      throw new ForbiddenError('Request from an unknown origin');
    }
  });
