import type { AppUser, AuditEntry, UserCreate, UserUpdate, WellMembersPut } from '@ddr/schemas';
import { isRole } from '@ddr/schemas';
import type { Auth } from '../../auth/auth';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import type { wellsService } from '../wells/service';
import type { accessRepository, UserRow } from './repository';

const toUser = (row: UserRow): AppUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: isRole(row.role) ? row.role : 'client',
  banned: row.banned ?? false,
  createdAt: row.createdAt.toISOString(),
});

export const accessService = (
  repository: ReturnType<typeof accessRepository>,
  auth: Auth,
  wells: ReturnType<typeof wellsService>,
) => {
  const get = async (id: string): Promise<UserRow> => {
    const row = await repository.findUser(id);
    if (!row) throw new NotFoundError('User not found');
    return row;
  };

  return {
    async listUsers(): Promise<AppUser[]> {
      return (await repository.listUsers()).map(toUser);
    },

    /** An admin creates the user with a first password (sign-up is closed). */
    async createUser(input: UserCreate): Promise<AppUser> {
      const email = input.email.toLowerCase();
      if ((await repository.listUsers()).some((row) => row.email === email)) {
        throw new ConflictError('A user with this email already exists');
      }
      const context = await auth.$context;
      const created = await context.internalAdapter.createUser(
        { email, name: input.name, emailVerified: true, role: input.role },
        { method: 'admin' },
      );
      await context.internalAdapter.createAccount({
        userId: created.id,
        providerId: 'credential',
        accountId: created.id,
        password: await context.password.hash(input.password),
      });
      return toUser(await get(created.id));
    },

    /** Role, name, deactivation. Deactivating revokes every session of the user (docs/07). */
    async updateUser(actorId: string, id: string, input: UserUpdate): Promise<AppUser> {
      await get(id);
      if (id === actorId && (input.banned === true || (input.role && input.role !== 'admin'))) {
        throw new ValidationError([
          {
            path: 'body',
            message: 'You cannot deactivate yourself or take away your own admin role',
          },
        ]);
      }
      const row = await repository.updateUser(id, input);
      if (input.banned === true) await repository.revokeSessions(id);
      return toUser(row as UserRow);
    },

    /** Password reset by an admin (docs/07: no email reset in the first version). */
    async setPassword(id: string, password: string): Promise<void> {
      await get(id);
      const context = await auth.$context;
      await context.internalAdapter.updatePassword(id, await context.password.hash(password));
      await repository.revokeSessions(id);
    },

    async membersOf(wellId: string): Promise<AppUser[]> {
      await wells.get(wellId);
      return (await repository.membersOf(wellId)).map(toUser);
    },

    /** Replaces the users assigned to a well (engineers and clients; staff see every well). */
    async replaceMembers(wellId: string, input: WellMembersPut): Promise<AppUser[]> {
      await wells.get(wellId);
      const ids = [...new Set(input.userIds)];
      const known = new Set(await repository.knownUserIds(ids));
      const issues = ids.flatMap((id, index) =>
        known.has(id) ? [] : [{ path: `body.userIds.${index}`, message: 'Unknown user' }],
      );
      if (issues.length > 0) throw new ValidationError(issues);
      await repository.replaceMembers(wellId, ids);
      return this.membersOf(wellId);
    },

    wellsOf: (userId: string) => repository.wellsOf(userId),

    async auditOf(reportId: string): Promise<AuditEntry[]> {
      return (await repository.auditOf(reportId)).map(({ entry, userName }) => ({
        id: entry.id,
        userName,
        action: entry.action,
        revisionBefore: entry.revisionBefore,
        revisionAfter: entry.revisionAfter,
        changes: entry.changes,
        at: entry.createdAt.toISOString(),
      }));
    },
  };
};
