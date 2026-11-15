import { and, asc, eq, isNotNull, isNull, max } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { pumps } from '../../db/schema';

export type PumpRow = typeof pumps.$inferSelect;
export type NewPumpRow = typeof pumps.$inferInsert;

export const pumpsRepository = (db: Db) => ({
  listByProject(projectId: string, archived: boolean): Promise<PumpRow[]> {
    return db
      .select()
      .from(pumps)
      .where(
        and(
          eq(pumps.projectId, projectId),
          archived ? isNotNull(pumps.archivedAt) : isNull(pumps.archivedAt),
        ),
      )
      .orderBy(asc(pumps.sortOrder), asc(pumps.id));
  },

  async nextSortOrder(projectId: string): Promise<number> {
    const [row] = await db
      .select({ last: max(pumps.sortOrder) })
      .from(pumps)
      .where(eq(pumps.projectId, projectId));
    return (row?.last ?? 0) + 1;
  },

  async findById(pumpId: string): Promise<PumpRow | undefined> {
    const [row] = await db.select().from(pumps).where(eq(pumps.id, pumpId));
    return row;
  },

  async insert(values: NewPumpRow): Promise<PumpRow> {
    const [row] = await db.insert(pumps).values(values).returning();
    if (!row) throw new Error('insert into pumps returned no row');
    return row;
  },

  async update(pumpId: string, values: Partial<NewPumpRow>): Promise<PumpRow | undefined> {
    const [row] = await db.update(pumps).set(values).where(eq(pumps.id, pumpId)).returning();
    return row;
  },

  /** Throws a foreign-key violation when another row refers to the pump. */
  async delete(pumpId: string): Promise<boolean> {
    const rows = await db.delete(pumps).where(eq(pumps.id, pumpId)).returning({ id: pumps.id });
    return rows.length > 0;
  },
});
