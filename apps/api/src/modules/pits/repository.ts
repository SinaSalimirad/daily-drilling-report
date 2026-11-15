import { and, asc, eq, isNotNull, isNull, max } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { pits } from '../../db/schema';

export type PitRow = typeof pits.$inferSelect;
export type NewPitRow = typeof pits.$inferInsert;

export const pitsRepository = (db: Db) => ({
  listByProject(projectId: string, archived: boolean): Promise<PitRow[]> {
    return db
      .select()
      .from(pits)
      .where(
        and(
          eq(pits.projectId, projectId),
          archived ? isNotNull(pits.archivedAt) : isNull(pits.archivedAt),
        ),
      )
      .orderBy(asc(pits.sortOrder), asc(pits.name));
  },

  async nextSortOrder(projectId: string): Promise<number> {
    const [row] = await db
      .select({ last: max(pits.sortOrder) })
      .from(pits)
      .where(eq(pits.projectId, projectId));
    return (row?.last ?? 0) + 1;
  },

  async findById(pitId: string): Promise<PitRow | undefined> {
    const [row] = await db.select().from(pits).where(eq(pits.id, pitId));
    return row;
  },

  async insert(values: NewPitRow): Promise<PitRow> {
    const [row] = await db.insert(pits).values(values).returning();
    if (!row) throw new Error('insert into pits returned no row');
    return row;
  },

  async update(pitId: string, values: Partial<NewPitRow>): Promise<PitRow | undefined> {
    const [row] = await db.update(pits).set(values).where(eq(pits.id, pitId)).returning();
    return row;
  },

  /** Throws a foreign-key violation when another row refers to the pit. */
  async delete(pitId: string): Promise<boolean> {
    const rows = await db.delete(pits).where(eq(pits.id, pitId)).returning({ id: pits.id });
    return rows.length > 0;
  },
});
