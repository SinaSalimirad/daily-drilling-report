import type { WellListQuery } from '@ddr/schemas';
import { and, asc, count, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { wellMembers, wells } from '../../db/schema';

export type WellRow = typeof wells.$inferSelect;
export type NewWellRow = typeof wells.$inferInsert;

const SORT_COLUMNS = {
  name: wells.name,
  spudDate: wells.spudDate,
  createdAt: wells.createdAt,
} as const;

export const wellsRepository = (db: Db) => ({
  /** `memberId`: only the wells assigned to this user (`well_members`). */
  async listByProject(
    projectId: string,
    { page, pageSize, sort, archived }: WellListQuery,
    memberId?: string,
  ) {
    const where = and(
      eq(wells.projectId, projectId),
      archived ? isNotNull(wells.archivedAt) : isNull(wells.archivedAt),
      memberId
        ? inArray(
            wells.id,
            db
              .select({ id: wellMembers.wellId })
              .from(wellMembers)
              .where(eq(wellMembers.userId, memberId)),
          )
        : undefined,
    );
    const column = SORT_COLUMNS[sort?.field ?? 'name'];
    const order = sort?.direction === 'desc' ? desc(column) : asc(column);
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(wells)
        .where(where)
        .orderBy(order, asc(wells.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(wells).where(where),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  },

  async findById(wellId: string): Promise<WellRow | undefined> {
    const [row] = await db.select().from(wells).where(eq(wells.id, wellId));
    return row;
  },

  async insert(values: NewWellRow): Promise<WellRow> {
    const [row] = await db.insert(wells).values(values).returning();
    if (!row) throw new Error('insert into wells returned no row');
    return row;
  },

  async update(wellId: string, values: Partial<NewWellRow>): Promise<WellRow | undefined> {
    const [row] = await db.update(wells).set(values).where(eq(wells.id, wellId)).returning();
    return row;
  },
});
