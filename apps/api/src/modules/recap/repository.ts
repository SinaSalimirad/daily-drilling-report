import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { activities, dailyReports, reportActivities } from '../../db/schema';

export const recapRepository = (db: Db) => ({
  /** Reports of the well in order, with what the recap reads from them. */
  reportsOf(wellId: string) {
    return db
      .select({
        id: dailyReports.id,
        reportNo: dailyReports.reportNo,
        sectionId: dailyReports.sectionId,
        rop: dailyReports.rop,
      })
      .from(dailyReports)
      .where(eq(dailyReports.wellId, wellId))
      .orderBy(asc(dailyReports.reportNo));
  },

  /** Hours per activity over the given reports. */
  async hoursByActivity(reportIds: string[]): Promise<{ activity: string; hours: number }[]> {
    if (reportIds.length === 0) return [];
    const rows = await db
      .select({
        activity: activities.name,
        hours: sql<string>`sum(${reportActivities.hours})`,
      })
      .from(reportActivities)
      .innerJoin(activities, eq(activities.id, reportActivities.activityId))
      .where(and(inArray(reportActivities.reportId, reportIds)))
      .groupBy(activities.name)
      .orderBy(sql`sum(${reportActivities.hours}) desc`);
    return rows.map((row) => ({ activity: row.activity, hours: Number(row.hours) }));
  },
});
