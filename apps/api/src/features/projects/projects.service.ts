import { asc, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { type InsertProject, projects, type UpdateProject } from "./projects.schema";

export function projectService() {
  const service = {
    list: () => db.select().from(projects).orderBy(asc(projects.name)),

    findOne: async (id: string) => {
      const [row] = await db.select().from(projects).where(eq(projects.id, id));

      if (!row) throw new NotFoundError(`Project "${id}" not found`);

      return row;
    },

    create: async (input: InsertProject) => {
      const [row] = await db.insert(projects).values(input).returning();

      return row;
    },

    // Partial update (PATCH): only the fields present in input are changed.
    update: async (id: string, input: UpdateProject) => {
      // drizzle throws on an empty SET, so an empty patch just returns the current row.
      if (Object.values(input).every((value) => value === undefined)) {
        return service.findOne(id);
      }

      const [row] = await db.update(projects).set(input).where(eq(projects.id, id)).returning();

      if (!row) throw new NotFoundError(`Project "${id}" not found`);

      return row;
    },

    remove: async (id: string) => {
      // A project that still has wells is rejected by the database (see dbErrorsPlugin).
      const deleted = await db
        .delete(projects)
        .where(eq(projects.id, id))
        .returning({ id: projects.id });

      if (deleted.length === 0) throw new NotFoundError(`Project "${id}" not found`);
    },
  };

  return service;
}
