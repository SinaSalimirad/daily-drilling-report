import { and, desc, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { type InsertReport, reports, type UpdateReport } from "./reports.schema";

type ListFilters = { wellId?: string; sectionId?: string };

export function reportService() {
  const service = {
    // Newest report first.
    list: ({ wellId, sectionId }: ListFilters = {}) =>
      db
        .select()
        .from(reports)
        .where(
          and(
            wellId ? eq(reports.wellId, wellId) : undefined,
            sectionId ? eq(reports.sectionId, sectionId) : undefined,
          ),
        )
        .orderBy(desc(reports.date), desc(reports.reportNumber)),

    findOne: async (id: string) => {
      const [row] = await db.select().from(reports).where(eq(reports.id, id));

      if (!row) throw new NotFoundError(`Report "${id}" not found`);

      return row;
    },

    create: async (input: InsertReport) => {
      const [row] = await db.insert(reports).values(input).returning();

      return row;
    },

    // Partial update (PATCH): only the fields present in input are changed.
    update: async (id: string, input: UpdateReport) => {
      // drizzle throws on an empty SET, so an empty patch just returns the current row.
      if (Object.values(input).every((value) => value === undefined)) {
        return service.findOne(id);
      }

      const [row] = await db.update(reports).set(input).where(eq(reports.id, id)).returning();

      if (!row) throw new NotFoundError(`Report "${id}" not found`);

      return row;
    },

    remove: async (id: string) => {
      // A report that still has inventories is rejected by the database (see dbErrorsPlugin).
      const deleted = await db
        .delete(reports)
        .where(eq(reports.id, id))
        .returning({ id: reports.id });

      if (deleted.length === 0) throw new NotFoundError(`Report "${id}" not found`);
    },
  };

  return service;
}
