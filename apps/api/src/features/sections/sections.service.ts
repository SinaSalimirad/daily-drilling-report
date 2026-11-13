import { asc, eq, getTableColumns } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { wells } from "../wells/wells.schema";
import { type InsertSection, sections, type UpdateSection } from "./sections.schema";

export function sectionService() {
  const service = {
    // Every section comes with its well name so the table can show it without a second request.
    // Sections are shown in drilling order, so sort by sequence.
    list: (wellId?: string) =>
      db
        .select({ ...getTableColumns(sections), wellName: wells.name })
        .from(sections)
        .innerJoin(wells, eq(wells.id, sections.wellId))
        .where(wellId ? eq(sections.wellId, wellId) : undefined)
        .orderBy(asc(sections.wellId), asc(sections.sequence)),

    findOne: async (id: string) => {
      const [row] = await db.select().from(sections).where(eq(sections.id, id));

      if (!row) throw new NotFoundError(`Section "${id}" not found`);

      return row;
    },

    create: async (input: InsertSection) => {
      const [row] = await db.insert(sections).values(input).returning();

      return row;
    },

    // Partial update (PATCH): only the fields present in input are changed.
    update: async (id: string, input: UpdateSection) => {
      // drizzle throws on an empty SET, so an empty patch just returns the current row.
      if (Object.values(input).every((value) => value === undefined)) {
        return service.findOne(id);
      }

      const [row] = await db.update(sections).set(input).where(eq(sections.id, id)).returning();

      if (!row) throw new NotFoundError(`Section "${id}" not found`);

      return row;
    },

    remove: async (id: string) => {
      // A section that still has reports is rejected by the database (see dbErrorsPlugin).
      const deleted = await db
        .delete(sections)
        .where(eq(sections.id, id))
        .returning({ id: sections.id });

      if (deleted.length === 0) throw new NotFoundError(`Section "${id}" not found`);
    },
  };

  return service;
}
