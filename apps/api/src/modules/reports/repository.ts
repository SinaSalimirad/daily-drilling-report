import { and, count, desc, eq, lt, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { dailyReports } from '../../db/schema';

export type ReportRow = typeof dailyReports.$inferSelect;
export type NewReportRow = typeof dailyReports.$inferInsert;

export const reportsRepository = (db: Db) => ({
  async listByWell(wellId: string, page: number, pageSize: number, onlySubmitted = false) {
    const where = onlySubmitted
      ? and(eq(dailyReports.wellId, wellId), eq(dailyReports.status, 'submitted'))
      : eq(dailyReports.wellId, wellId);
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(dailyReports)
        .where(where)
        .orderBy(desc(dailyReports.reportNo))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(dailyReports).where(where),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  },

  /** The report with the highest number of the well. */
  async findLatest(wellId: string): Promise<ReportRow | undefined> {
    const [row] = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.wellId, wellId))
      .orderBy(desc(dailyReports.reportNo))
      .limit(1);
    return row;
  },

  async findByDate(wellId: string, reportDate: string): Promise<ReportRow | undefined> {
    const [row] = await db
      .select()
      .from(dailyReports)
      .where(and(eq(dailyReports.wellId, wellId), eq(dailyReports.reportDate, reportDate)));
    return row;
  },

  async findById(reportId: string): Promise<ReportRow | undefined> {
    const [row] = await db.select().from(dailyReports).where(eq(dailyReports.id, reportId));
    return row;
  },

  /** The report of the well just before the given number. */
  async findPrevious(wellId: string, reportNo: number): Promise<ReportRow | undefined> {
    const [row] = await db
      .select()
      .from(dailyReports)
      .where(and(eq(dailyReports.wellId, wellId), lt(dailyReports.reportNo, reportNo)))
      .orderBy(desc(dailyReports.reportNo))
      .limit(1);
    return row;
  },

  /**
   * Writes the values and raises the revision in one statement, only when the stored
   * revision is the one the client read. Undefined when no row matched.
   */
  async updateAtRevision(
    reportId: string,
    revision: number,
    values: Partial<NewReportRow>,
  ): Promise<ReportRow | undefined> {
    const [row] = await db
      .update(dailyReports)
      .set({ ...values, revision: sql`${dailyReports.revision} + 1` })
      .where(and(eq(dailyReports.id, reportId), eq(dailyReports.revision, revision)))
      .returning();
    return row;
  },

  /** Marks the report submitted at the revision the client read; undefined on a mismatch. */
  async submitAtRevision(
    reportId: string,
    revision: number,
    acknowledgedWarnings: string[],
  ): Promise<ReportRow | undefined> {
    const now = new Date();
    return this.updateAtRevision(reportId, revision, {
      status: 'submitted',
      submittedAt: now,
      // Same instant, so a later edit is told apart by `updated_at > submitted_at`.
      updatedAt: now,
      acknowledgedWarnings,
    });
  },

  async insert(values: NewReportRow): Promise<ReportRow> {
    const [row] = await db.insert(dailyReports).values(values).returning();
    if (!row) throw new Error('insert into daily_reports returned no row');
    return row;
  },

  async delete(reportId: string): Promise<boolean> {
    const rows = await db
      .delete(dailyReports)
      .where(eq(dailyReports.id, reportId))
      .returning({ id: dailyReports.id });
    return rows.length > 0;
  },
});
