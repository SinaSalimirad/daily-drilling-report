import { asc, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { pitReadings, pits } from '../../db/schema';

export type PitReadingData = {
  pitId: string;
  pitType: 'active' | 'reserve' | 'not_mud';
  volume: number;
  mudWeight: number | null;
  mudTypeId: string | null;
};

export const pitReadingsRepository = (db: Db) => ({
  list(reportId: string) {
    return db
      .select({
        id: pitReadings.id,
        pitId: pitReadings.pitId,
        pitName: pits.name,
        pitType: pitReadings.pitType,
        volume: pitReadings.volume,
        mudWeight: pitReadings.mudWeight,
        mudTypeId: pitReadings.mudTypeId,
      })
      .from(pitReadings)
      .innerJoin(pits, eq(pits.id, pitReadings.pitId))
      .where(eq(pitReadings.reportId, reportId))
      .orderBy(asc(pits.sortOrder), asc(pits.name));
  },

  /** Deletes the readings of the report and writes the new ones, in one transaction. */
  async replace(reportId: string, rows: PitReadingData[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(pitReadings).where(eq(pitReadings.reportId, reportId));
      if (rows.length === 0) return;
      await tx.insert(pitReadings).values(rows.map((row) => ({ ...row, reportId })));
    });
  },

  /** Copies the readings of one report onto another (yesterday's values as the start). */
  async copy(fromReportId: string, toReportId: string): Promise<void> {
    const rows = await db.select().from(pitReadings).where(eq(pitReadings.reportId, fromReportId));
    if (rows.length === 0) return;
    await db.insert(pitReadings).values(
      rows.map((row) => ({
        reportId: toReportId,
        pitId: row.pitId,
        pitType: row.pitType,
        volume: row.volume,
        mudWeight: row.mudWeight,
        mudTypeId: row.mudTypeId,
      })),
    );
  },
});
