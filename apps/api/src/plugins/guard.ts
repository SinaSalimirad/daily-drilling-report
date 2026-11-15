import { can, type Permission } from '@ddr/schemas';
import { Elysia } from 'elysia';
import type { SessionUser } from '../auth/session';
import { ForbiddenError, UnauthenticatedError } from '../lib/errors';

// docs/07-authentication-and-authorization.md: every route declares the permission it needs,
// e.g. `.get('/wells', handler, { permission: 'report:read' })`. The session is resolved once
// per request in `createApp` (`authUser`); the role is checked here, in one place:
// 401 without a session, 403 when the role lacks the permission.

export type GuardContext = { authUser?: SessionUser | null };

export const guard = new Elysia({ name: 'guard' }).macro({
  permission: (permission: Permission) => ({
    beforeHandle(context) {
      const user = (context as GuardContext).authUser;
      if (!user) throw new UnauthenticatedError();
      if (!can(user.role, permission)) throw new ForbiddenError();
    },
  }),
});
