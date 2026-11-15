import { asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { auditLog, session, user, wellMembers } from '../../db/schema';

export type UserRow = typeof user.$inferSelect;

export const accessRepository = (db: Db) => ({
  listUsers(): Promise<UserRow[]> {
    return db.select().from(user).orderBy(asc(user.name));
  },

  async findUser(id: string): Promise<UserRow | undefined> {
    const [row] = await db.select().from(user).where(eq(user.id, id));
    return row;
  },

  async updateUser(id: string, values: Partial<Pick<UserRow, 'name' | 'role' | 'banned'>>) {
    const [row] = await db
      .update(user)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();
    return row;
  },

  /** Ends every session of the user (deactivation, password reset). */
  async revokeSessions(userId: string): Promise<void> {
    await db.delete(session).where(eq(session.userId, userId));
  },

  async membersOf(wellId: string): Promise<UserRow[]> {
    const rows = await db
      .select({ u: user })
      .from(wellMembers)
      .innerJoin(user, eq(user.id, wellMembers.userId))
      .where(eq(wellMembers.wellId, wellId))
      .orderBy(asc(user.name));
    return rows.map((row) => row.u);
  },

  async knownUserIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await db.select({ id: user.id }).from(user).where(inArray(user.id, ids));
    return rows.map((row) => row.id);
  },

  async replaceMembers(wellId: string, userIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(wellMembers).where(eq(wellMembers.wellId, wellId));
      if (userIds.length > 0) {
        await tx.insert(wellMembers).values(userIds.map((userId) => ({ userId, wellId })));
      }
    });
  },

  async wellsOf(userId: string): Promise<string[]> {
    const rows = await db
      .select({ wellId: wellMembers.wellId })
      .from(wellMembers)
      .where(eq(wellMembers.userId, userId));
    return rows.map((row) => row.wellId);
  },

  auditOf(reportId: string) {
    return db
      .select({ entry: auditLog, userName: user.name })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.userId))
      .where(eq(auditLog.reportId, reportId))
      .orderBy(asc(auditLog.createdAt));
  },

  async addAudit(values: typeof auditLog.$inferInsert): Promise<void> {
    await db.insert(auditLog).values(values);
  },
});
