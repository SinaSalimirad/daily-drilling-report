import { asc, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { mudSamples } from '../../db/schema';

export type SampleRow = typeof mudSamples.$inferSelect;
export type NewSampleRow = Omit<typeof mudSamples.$inferInsert, 'reportId'>;

export const samplesRepository = (db: Db) => ({
  list(reportId: string): Promise<SampleRow[]> {
    return db
      .select()
      .from(mudSamples)
      .where(eq(mudSamples.reportId, reportId))
      .orderBy(asc(mudSamples.seq));
  },

  async replace(reportId: string, rows: NewSampleRow[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(mudSamples).where(eq(mudSamples.reportId, reportId));
      if (rows.length > 0)
        await tx.insert(mudSamples).values(rows.map((row) => ({ ...row, reportId })));
    });
  },
});
