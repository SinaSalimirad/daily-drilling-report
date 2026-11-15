import { asc, eq, max } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { drillingSections } from '../../db/schema';

export type SectionRow = typeof drillingSections.$inferSelect;
export type NewSectionRow = typeof drillingSections.$inferInsert;

export const sectionsRepository = (db: Db) => ({
  listByWell(wellId: string): Promise<SectionRow[]> {
    return db
      .select()
      .from(drillingSections)
      .where(eq(drillingSections.wellId, wellId))
      .orderBy(asc(drillingSections.sortOrder), asc(drillingSections.createdAt));
  },

  async nextSortOrder(wellId: string): Promise<number> {
    const [row] = await db
      .select({ last: max(drillingSections.sortOrder) })
      .from(drillingSections)
      .where(eq(drillingSections.wellId, wellId));
    return (row?.last ?? 0) + 1;
  },

  async findById(sectionId: string): Promise<SectionRow | undefined> {
    const [row] = await db
      .select()
      .from(drillingSections)
      .where(eq(drillingSections.id, sectionId));
    return row;
  },

  async insert(values: NewSectionRow): Promise<SectionRow> {
    const [row] = await db.insert(drillingSections).values(values).returning();
    if (!row) throw new Error('insert into drilling_sections returned no row');
    return row;
  },

  async update(sectionId: string, values: Partial<NewSectionRow>): Promise<SectionRow | undefined> {
    const [row] = await db
      .update(drillingSections)
      .set(values)
      .where(eq(drillingSections.id, sectionId))
      .returning();
    return row;
  },

  /** Throws a foreign-key violation (→ 409 IN_USE) once reports refer to the section. */
  async delete(sectionId: string): Promise<boolean> {
    const rows = await db
      .delete(drillingSections)
      .where(eq(drillingSections.id, sectionId))
      .returning({ id: drillingSections.id });
    return rows.length > 0;
  },
});
