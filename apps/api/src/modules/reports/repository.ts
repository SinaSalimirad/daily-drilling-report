import { and, count, desc, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { dailyReports } from '../../db/schema';

export type ReportRow = typeof dailyReports.$inferSelect;
export type NewReportRow = typeof dailyReports.$inferInsert;

export const reportsRepository = (db: Db) => ({
  async listByWell(wellId: string, page: number, pageSize: number) {
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(dailyReports)
        .where(eq(dailyReports.wellId, wellId))
        .orderBy(desc(dailyReports.reportNo))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(dailyReports).where(eq(dailyReports.wellId, wellId)),
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
