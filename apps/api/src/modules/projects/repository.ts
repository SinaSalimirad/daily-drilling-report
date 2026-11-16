import type { ProjectListQuery } from '@ddr/schemas';
import { and, asc, count, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { projects, wellMembers, wells } from '../../db/schema';

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;

export const projectsRepository = (db: Db) => ({
  /** `memberId`: only the projects holding at least one well assigned to this user. */
  async list({ page, pageSize, sort, archived }: ProjectListQuery, memberId?: string) {
    const where = and(
      archived ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt),
      memberId
        ? inArray(
            projects.id,
            db
              .select({ id: wells.projectId })
              .from(wells)
              .innerJoin(wellMembers, eq(wellMembers.wellId, wells.id))
              .where(eq(wellMembers.userId, memberId)),
          )
        : undefined,
    );
    const column = sort?.field === 'createdAt' ? projects.createdAt : projects.name;
    const order = sort?.direction === 'desc' ? desc(column) : asc(column);
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(where)
        .orderBy(order, asc(projects.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(projects).where(where),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  },

  async findById(projectId: string): Promise<ProjectRow | undefined> {
    const [row] = await db.select().from(projects).where(eq(projects.id, projectId));
    return row;
  },

  async insert(values: NewProjectRow): Promise<ProjectRow> {
    const [row] = await db.insert(projects).values(values).returning();
    if (!row) throw new Error('insert into projects returned no row');
    return row;
  },

  async update(projectId: string, values: Partial<NewProjectRow>): Promise<ProjectRow | undefined> {
    const [row] = await db
      .update(projects)
      .set(values)
      .where(eq(projects.id, projectId))
      .returning();
    return row;
  },
});
