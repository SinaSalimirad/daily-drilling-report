import type { Permission } from '@ddr/schemas';
import { Elysia } from 'elysia';

// docs/07-authentication-and-authorization.md: every route declares the permission it
// will need, e.g. `.get('/wells', handler, { permission: 'report:read' })`.
// Until v0.9.0 the guard allows everything; then it resolves the session and checks the
// role here, in one place (401 UnauthenticatedError, 403 ForbiddenError).

export const guard = new Elysia({ name: 'guard' }).macro({
  permission: (_permission: Permission) => ({
    beforeHandle() {
      // Open until v0.9.0.
    },
  }),
});
