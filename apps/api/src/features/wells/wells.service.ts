import { asc, eq, getTableColumns } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { projects } from "../projects/projects.schema";
import { type InsertWell, type UpdateWell, wells } from "./wells.schema";

export function wellService() {
  const service = {
    // Every well comes with its project name so the table can show it without a second request.
    list: (projectId?: string) =>
      db
        .select({ ...getTableColumns(wells), projectName: projects.name })
        .from(wells)
        .innerJoin(projects, eq(projects.id, wells.projectId))
        .where(projectId ? eq(wells.projectId, projectId) : undefined)
        .orderBy(asc(wells.name)),

    findOne: async (id: string) => {
      const [row] = await db.select().from(wells).where(eq(wells.id, id));

      if (!row) throw new NotFoundError(`Well "${id}" not found`);

      return row;
    },

    create: async (input: InsertWell) => {
      const [row] = await db.insert(wells).values(input).returning();

      return row;
    },

    // Partial update (PATCH): only the fields present in input are changed.
    update: async (id: string, input: UpdateWell) => {
      // drizzle throws on an empty SET, so an empty patch just returns the current row.
      if (Object.values(input).every((value) => value === undefined)) {
        return service.findOne(id);
      }

      const [row] = await db.update(wells).set(input).where(eq(wells.id, id)).returning();

      if (!row) throw new NotFoundError(`Well "${id}" not found`);

      return row;
    },

    remove: async (id: string) => {
      // A well that still has sections or reports is rejected by the database (see dbErrorsPlugin).
      const deleted = await db.delete(wells).where(eq(wells.id, id)).returning({ id: wells.id });

      if (deleted.length === 0) throw new NotFoundError(`Well "${id}" not found`);
    },
  };

  return service;
}
