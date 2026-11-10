import { desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { NotFoundError } from "@/shared/errors";
import { reports } from "./reports.table";

// Business logic lives here, with the database injected so tests can swap it.
export function createReportsService(db: Database) {
  return {
    list: () => db.select().from(reports).orderBy(desc(reports.reportDate), desc(reports.id)),

    async get(id: number) {
      const [row] = await db.select().from(reports).where(eq(reports.id, id));
      if (!row) throw new NotFoundError("Report");
      return row;
    },

    async create(input: {
      wellName: string;
      reportDate: string;
      depthM: number;
      mudWeightPpg: number;
      notes?: string;
    }) {
      const [row] = await db
        .insert(reports)
        .values({ ...input, mudWeightPpg: input.mudWeightPpg.toFixed(2) })
        .returning();
      return row;
    },

    async remove(id: number) {
      const deleted = await db
        .delete(reports)
        .where(eq(reports.id, id))
        .returning({ id: reports.id });
      if (deleted.length === 0) throw new NotFoundError("Report");
    },
  };
}
