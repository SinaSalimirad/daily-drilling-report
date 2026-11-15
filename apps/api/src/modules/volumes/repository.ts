import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { dailyReports, pumpReadings, pumps, volumeEntries } from '../../db/schema';

export const volumesRepository = (db: Db) => ({
  pumpReadings(reportId: string) {
    return db
      .select({ pumpId: pumpReadings.pumpId, model: pumps.model, spm: pumpReadings.spm })
      .from(pumpReadings)
      .innerJoin(pumps, eq(pumps.id, pumpReadings.pumpId))
      .where(eq(pumpReadings.reportId, reportId))
      .orderBy(asc(pumps.sortOrder));
  },

  async replacePumpReadings(reportId: string, rows: { pumpId: string; spm: number }[]) {
    await db.transaction(async (tx) => {
      await tx.delete(pumpReadings).where(eq(pumpReadings.reportId, reportId));
      if (rows.length > 0) {
        await tx.insert(pumpReadings).values(rows.map((row) => ({ ...row, reportId })));
      }
    });
  },

  /** Entries of the given reports, m³ per item. */
  async entriesOf(reportIds: string[]) {
    if (reportIds.length === 0) return [];
    return db.select().from(volumeEntries).where(inArray(volumeEntries.reportId, reportIds));
  },

  async replaceEntries(
    reportId: string,
    rows: { item: (typeof volumeEntries.$inferInsert)['item']; volume: number }[],
  ) {
    await db.transaction(async (tx) => {
      await tx.delete(volumeEntries).where(eq(volumeEntries.reportId, reportId));
      if (rows.length > 0) {
        await tx.insert(volumeEntries).values(rows.map((row) => ({ ...row, reportId })));
      }
    });
  },

  /** Reports of the well up to and including `reportNo`, in order. */
  reportsUpTo(wellId: string, reportNo: number) {
    return db
      .select({
        id: dailyReports.id,
        reportNo: dailyReports.reportNo,
        sectionId: dailyReports.sectionId,
      })
      .from(dailyReports)
      .where(and(eq(dailyReports.wellId, wellId), lte(dailyReports.reportNo, reportNo)))
      .orderBy(asc(dailyReports.reportNo));
  },
});
