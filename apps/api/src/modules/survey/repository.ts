import { asc, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { surveyStations } from '../../db/schema';

export type StationRow = typeof surveyStations.$inferSelect;

export const surveyRepository = (db: Db) => ({
  list(wellId: string): Promise<StationRow[]> {
    return db
      .select()
      .from(surveyStations)
      .where(eq(surveyStations.wellId, wellId))
      .orderBy(asc(surveyStations.measuredDepth));
  },

  async replace(
    wellId: string,
    rows: { measuredDepth: number; inclination: number; azimuth: number }[],
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(surveyStations).where(eq(surveyStations.wellId, wellId));
      if (rows.length > 0)
        await tx.insert(surveyStations).values(rows.map((row) => ({ ...row, wellId })));
    });
  },
});
