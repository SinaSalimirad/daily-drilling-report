import { asc, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { activities, reportActivities } from '../../db/schema';

export type ActivityRowData = { activityId: string; hours: number };

export const reportActivitiesRepository = (db: Db) => ({
  list(reportId: string) {
    return db
      .select({
        id: reportActivities.id,
        activityId: reportActivities.activityId,
        name: activities.name,
        hours: reportActivities.hours,
        sortOrder: reportActivities.sortOrder,
      })
      .from(reportActivities)
      .innerJoin(activities, eq(activities.id, reportActivities.activityId))
      .where(eq(reportActivities.reportId, reportId))
      .orderBy(asc(reportActivities.sortOrder));
  },

  /** Deletes the rows of the report and writes the new ones, in one transaction. */
  async replace(reportId: string, rows: ActivityRowData[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(reportActivities).where(eq(reportActivities.reportId, reportId));
      if (rows.length === 0) return;
      await tx
        .insert(reportActivities)
        .values(rows.map((row, index) => ({ ...row, reportId, sortOrder: index + 1 })));
    });
  },
});
