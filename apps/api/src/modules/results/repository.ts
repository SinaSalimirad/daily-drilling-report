import { and, eq, gt, inArray } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { dailyReports, reportResults } from '../../db/schema';

export type ResultRow = typeof reportResults.$inferSelect;

export const resultsRepository = (db: Db) => ({
  async find(reportId: string): Promise<ResultRow | undefined> {
    const [row] = await db.select().from(reportResults).where(eq(reportResults.reportId, reportId));
    return row;
  },

  async upsert(values: {
    reportId: string;
    revision: number;
    engineVersion: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const row = { ...values, isStale: false, calculatedAt: new Date() };
    await db
      .insert(reportResults)
      .values(row)
      .onConflictDoUpdate({ target: reportResults.reportId, set: row });
  },

  /** Marks the results of the later reports of the well stale. */
  async markLaterStale(wellId: string, reportNo: number): Promise<number> {
    const later = await db
      .select({ id: dailyReports.id })
      .from(dailyReports)
      .where(and(eq(dailyReports.wellId, wellId), gt(dailyReports.reportNo, reportNo)));
    if (later.length === 0) return 0;
    const rows = await db
      .update(reportResults)
      .set({ isStale: true })
      .where(
        inArray(
          reportResults.reportId,
          later.map((row) => row.id),
        ),
      )
      .returning({ id: reportResults.reportId });
    return rows.length;
  },
});
