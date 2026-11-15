import { asc, eq, inArray, max } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { bhaComponents, bhaRuns, bitNozzles } from '../../db/schema';

export type BhaRunRow = typeof bhaRuns.$inferSelect;
export type NozzleRow = typeof bitNozzles.$inferSelect;
export type ComponentRow = typeof bhaComponents.$inferSelect;

export type RunWrite = {
  runNo: number;
  bitType: string | null;
  bitSize: number;
  manufacturer: string | null;
  knownTfa: number | null;
  toolPressureLoss: number | null;
  nozzles: { size32: number; quantity: number }[];
  components: {
    name: string;
    length: number | null;
    outerDiameter: number;
    innerDiameter: number;
  }[];
};

export type RunFull = BhaRunRow & { nozzles: NozzleRow[]; components: ComponentRow[] };

export const bhaRunsRepository = (db: Db) => {
  const attach = async (runs: BhaRunRow[]): Promise<RunFull[]> => {
    if (runs.length === 0) return [];
    const ids = runs.map((run) => run.id);
    const [nozzles, components] = await Promise.all([
      db
        .select()
        .from(bitNozzles)
        .where(inArray(bitNozzles.runId, ids))
        .orderBy(asc(bitNozzles.sortOrder)),
      db
        .select()
        .from(bhaComponents)
        .where(inArray(bhaComponents.runId, ids))
        .orderBy(asc(bhaComponents.sortOrder)),
    ]);
    return runs.map((run) => ({
      ...run,
      nozzles: nozzles.filter((n) => n.runId === run.id),
      components: components.filter((c) => c.runId === run.id),
    }));
  };

  const writeChildren = async (
    tx: Pick<Db, 'insert' | 'delete'>,
    runId: string,
    data: RunWrite,
  ) => {
    await tx.delete(bitNozzles).where(eq(bitNozzles.runId, runId));
    await tx.delete(bhaComponents).where(eq(bhaComponents.runId, runId));
    if (data.nozzles.length > 0) {
      await tx
        .insert(bitNozzles)
        .values(data.nozzles.map((n, index) => ({ ...n, runId, sortOrder: index + 1 })));
    }
    if (data.components.length > 0) {
      await tx
        .insert(bhaComponents)
        .values(data.components.map((c, index) => ({ ...c, runId, sortOrder: index + 1 })));
    }
  };

  return {
    async listByWell(wellId: string): Promise<RunFull[]> {
      const runs = await db
        .select()
        .from(bhaRuns)
        .where(eq(bhaRuns.wellId, wellId))
        .orderBy(asc(bhaRuns.runNo));
      return attach(runs);
    },

    async findById(id: string): Promise<RunFull | undefined> {
      const runs = await db.select().from(bhaRuns).where(eq(bhaRuns.id, id));
      return (await attach(runs))[0];
    },

    async nextRunNo(wellId: string): Promise<number> {
      const [row] = await db
        .select({ last: max(bhaRuns.runNo) })
        .from(bhaRuns)
        .where(eq(bhaRuns.wellId, wellId));
      return (row?.last ?? 0) + 1;
    },

    async insert(wellId: string, data: RunWrite): Promise<string> {
      return db.transaction(async (tx) => {
        const { nozzles: _n, components: _c, ...values } = data;
        const [row] = await tx
          .insert(bhaRuns)
          .values({ ...values, wellId })
          .returning({ id: bhaRuns.id });
        if (!row) throw new Error('insert into bha_runs returned no row');
        await writeChildren(tx, row.id, data);
        return row.id;
      });
    },

    async replace(id: string, data: RunWrite): Promise<boolean> {
      return db.transaction(async (tx) => {
        const { nozzles: _n, components: _c, ...values } = data;
        const rows = await tx
          .update(bhaRuns)
          .set(values)
          .where(eq(bhaRuns.id, id))
          .returning({ id: bhaRuns.id });
        if (rows.length === 0) return false;
        await writeChildren(tx, id, data);
        return true;
      });
    },

    /** Throws a foreign-key violation (→ 409 IN_USE) while a report refers to the run. */
    async delete(id: string): Promise<boolean> {
      const rows = await db.delete(bhaRuns).where(eq(bhaRuns.id, id)).returning({ id: bhaRuns.id });
      return rows.length > 0;
    },
  };
};
