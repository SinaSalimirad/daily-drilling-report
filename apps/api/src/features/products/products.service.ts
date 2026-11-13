import { asc, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { type InsertProduct, products, type UpdateProduct } from "./products.schema";

export function productService() {
  const service = {
    list: () => db.select().from(products).orderBy(asc(products.name)),
    findOne: async (id: string) => {
      const [row] = await db.select().from(products).where(eq(products.id, id));

      if (!row) throw new NotFoundError(`Product "${id}" not found`);

      return row;
    },

    create: async (input: InsertProduct) => {
      const [row] = await db.insert(products).values(input).returning();

      return row;
    },

    // Partial update (PATCH): only the fields present in input are changed.
    update: async (id: string, input: UpdateProduct) => {
      // drizzle throws on an empty SET, so an empty patch just returns the current row.
      if (Object.values(input).every((value) => value === undefined)) {
        return service.findOne(id);
      }

      const [row] = await db.update(products).set(input).where(eq(products.id, id)).returning();

      if (!row) throw new NotFoundError(`Product "${id}" not found`);

      return row;
    },

    remove: async (id: string) => {
      // A product still used by an inventory is rejected by the database (see dbErrorsPlugin).
      const deleted = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning({ id: products.id });
      if (deleted.length === 0) throw new NotFoundError(`Product "${id}" not found`);
    },
  };

  return service;
}
