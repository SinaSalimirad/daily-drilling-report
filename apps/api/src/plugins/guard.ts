import { can, type Permission } from '@ddr/schemas';
import { Elysia } from 'elysia';
import type { SessionUser } from '../auth/session';
import { ForbiddenError, UnauthenticatedError } from '../lib/errors';

// docs/07-authentication-and-authorization.md: every route declares the permission it needs,
// e.g. `.get('/wells', handler, { permission: 'report:read' })`. The session is resolved once
// per request in `createApp` (`authUser`); the role is checked here, in one place:
// 401 without a session, 403 when the role lacks the permission.

/** Checks the record-level rules of docs/07 ("Scope"): the well of the record the route touches. */
export type ScopeCheck = (
  permission: Permission,
  params: Record<string, string | undefined>,
  method: string,
) => Promise<void>;

export type GuardContext = { authUser?: SessionUser | null; scopeCheck?: ScopeCheck };

export const guard = new Elysia({ name: 'guard' }).macro({
  permission: (permission: Permission) => ({
    async beforeHandle(context) {
      const { authUser: user, scopeCheck } = context as GuardContext;
      if (!user) throw new UnauthenticatedError();
      // A role that cannot write reports but may edit submitted ones passes here; the scope
      // check then allows it only on a submitted report (docs/07 matrix).
      const editsSubmitted =
        permission === 'report:write' && can(user.role, 'report:edit_submitted');
      const allowed = can(user.role, permission);
      // Without a scope check there is nobody to confirm that the report is submitted.
      if (!allowed && !(editsSubmitted && scopeCheck)) throw new ForbiddenError();
      const { params, request } = context as unknown as {
        params: Record<string, string | undefined>;
        request: Request;
      };
      await scopeCheck?.(permission, params ?? {}, request.method);
    },
  }),
});
