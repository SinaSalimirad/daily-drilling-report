import { asc, count, eq, max } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { holeSections } from '../../db/schema';

export type HoleSectionRow = typeof holeSections.$inferSelect;
export type NewHoleSectionRow = typeof holeSections.$inferInsert;

export const holeSectionsRepository = (db: Db) => ({
  listByWell(wellId: string): Promise<HoleSectionRow[]> {
    return db
      .select()
      .from(holeSections)
      .where(eq(holeSections.wellId, wellId))
      .orderBy(asc(holeSections.sortOrder), asc(holeSections.createdAt));
  },

  async countByWell(wellId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(holeSections)
      .where(eq(holeSections.wellId, wellId));
    return row?.total ?? 0;
  },

  async nextSortOrder(wellId: string): Promise<number> {
    const [row] = await db
      .select({ last: max(holeSections.sortOrder) })
      .from(holeSections)
      .where(eq(holeSections.wellId, wellId));
    return (row?.last ?? 0) + 1;
  },

  async findById(id: string): Promise<HoleSectionRow | undefined> {
    const [row] = await db.select().from(holeSections).where(eq(holeSections.id, id));
    return row;
  },

  async insert(values: NewHoleSectionRow): Promise<HoleSectionRow> {
    const [row] = await db.insert(holeSections).values(values).returning();
    if (!row) throw new Error('insert into hole_sections returned no row');
    return row;
  },

  async update(id: string, values: Partial<NewHoleSectionRow>) {
    const [row] = await db
      .update(holeSections)
      .set(values)
      .where(eq(holeSections.id, id))
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const rows = await db
      .delete(holeSections)
      .where(eq(holeSections.id, id))
      .returning({ id: holeSections.id });
    return rows.length > 0;
  },
});
