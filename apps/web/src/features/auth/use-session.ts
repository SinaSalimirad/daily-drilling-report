'use client';

import { can, isRole, type Permission, type Role } from '@ddr/schemas';
import { authClient } from '@/lib/auth-client';

export type CurrentUser = { id: string; name: string; email: string; role: Role };

/** The signed-in user; `pending` while the session is being read. */
export function useCurrentUser(): { user: CurrentUser | null; pending: boolean } {
  const { data, isPending } = authClient.useSession();
  const role = data?.user.role;
  const user =
    data && isRole(role)
      ? { id: data.user.id, name: data.user.name, email: data.user.email, role }
      : null;
  return { user, pending: isPending };
}

/**
 * Whether the user has a permission. Hiding a control is a convenience; the API check is the
 * rule (docs/07).
 */
export function useCan(permission: Permission): boolean {
  const { user } = useCurrentUser();
  return user ? can(user.role, permission) : false;
}
