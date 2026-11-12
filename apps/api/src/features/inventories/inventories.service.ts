import { asc, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { type InsertInventory, inventories, type UpdateInventory } from "./inventories.schema";

export function inventoryService() {
  const service = {
    list: () => db.select().from(inventories).orderBy(asc(inventories.createdAt)),
    findOne: async (id: string) => {
      const [row] = await db.select().from(inventories).where(eq(inventories.id, id));

      if (!row) throw new NotFoundError(`Inventory "${id}" not found`);

      return row;
    },

    create: async (input: InsertInventory) => {
      const [row] = await db.insert(inventories).values(input).returning();

      return row;
    },

    // Partial update (PATCH): only the fields present in input are changed.
    update: async (id: string, input: UpdateInventory) => {
      // drizzle throws on an empty SET, so an empty patch just returns the current row.
      if (Object.values(input).every((value) => value === undefined)) {
        return service.findOne(id);
      }

      const [row] = await db
        .update(inventories)
        .set(input)
        .where(eq(inventories.id, id))
        .returning();

      if (!row) throw new NotFoundError(`Inventory "${id}" not found`);

      return row;
    },

    remove: async (id: string) => {
      const deleted = await db
        .delete(inventories)
        .where(eq(inventories.id, id))
        .returning({ id: inventories.id });
      if (deleted.length === 0) throw new NotFoundError(`Inventory "${id}" not found`);
    },
  };

  return service;
}
