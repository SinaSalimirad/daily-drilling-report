import { asc, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { type InsertProduct, products } from "./products.schema";

export function productService() {
  return {
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

    // Full replace (PUT): optional fields missing from input are reset to null.
    update: async (id: string, input: InsertProduct) => {
      const [row] = await db
        .update(products)
        .set({
          ...input,
          width: input.width ?? null,
          height: input.height ?? null,
          specificGravity: input.specificGravity ?? null,
          origin: input.origin ?? null,
          price: input.price ?? null,
        })
        .where(eq(products.id, id))
        .returning();

      if (!row) throw new NotFoundError(`Product "${id}" not found`);

      return row;
    },

    remove: async (id: string) => {
      const deleted = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning({ id: products.id });
      if (deleted.length === 0) throw new NotFoundError(`Product "${id}" not found`);
    },
  };
}
