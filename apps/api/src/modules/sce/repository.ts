import { and, asc, eq, isNotNull, isNull, max } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { sceUnits } from '../../db/schema';

export type SceUnitRow = typeof sceUnits.$inferSelect;
export type NewSceUnitRow = typeof sceUnits.$inferInsert;

export const sceUnitsRepository = (db: Db) => ({
  listByProject(projectId: string, archived: boolean): Promise<SceUnitRow[]> {
    return db
      .select()
      .from(sceUnits)
      .where(
        and(
          eq(sceUnits.projectId, projectId),
          archived ? isNotNull(sceUnits.archivedAt) : isNull(sceUnits.archivedAt),
        ),
      )
      .orderBy(asc(sceUnits.sortOrder), asc(sceUnits.id));
  },

  async nextSortOrder(projectId: string): Promise<number> {
    const [row] = await db
      .select({ last: max(sceUnits.sortOrder) })
      .from(sceUnits)
      .where(eq(sceUnits.projectId, projectId));
    return (row?.last ?? 0) + 1;
  },

  async findById(sceUnitId: string): Promise<SceUnitRow | undefined> {
    const [row] = await db.select().from(sceUnits).where(eq(sceUnits.id, sceUnitId));
    return row;
  },

  async insert(values: NewSceUnitRow): Promise<SceUnitRow> {
    const [row] = await db.insert(sceUnits).values(values).returning();
    if (!row) throw new Error('insert into sceUnits returned no row');
    return row;
  },

  async update(sceUnitId: string, values: Partial<NewSceUnitRow>): Promise<SceUnitRow | undefined> {
    const [row] = await db
      .update(sceUnits)
      .set(values)
      .where(eq(sceUnits.id, sceUnitId))
      .returning();
    return row;
  },

  /** Throws a foreign-key violation when another row refers to the unit. */
  async delete(sceUnitId: string): Promise<boolean> {
    const rows = await db
      .delete(sceUnits)
      .where(eq(sceUnits.id, sceUnitId))
      .returning({ id: sceUnits.id });
    return rows.length > 0;
  },
});
