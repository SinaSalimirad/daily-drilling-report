import { isRole, type Role } from '@ddr/schemas';
import type { Auth } from './auth';

/** The signed-in user of a request, as the guard sees it. */
export type SessionUser = { id: string; name: string; email: string; role: Role };

/** Resolves the user of a request; null when there is no valid session. */
export type SessionResolver = (request: Request) => Promise<SessionUser | null>;

/** Session of better-auth: cookie → user. A banned user or an unknown role has no access. */
export const resolveWith =
  (auth: Auth): SessionResolver =>
  async (request) => {
    const result = await auth.api.getSession({ headers: request.headers });
    const user = result?.user;
    if (!user || user.banned || !isRole(user.role)) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  };
