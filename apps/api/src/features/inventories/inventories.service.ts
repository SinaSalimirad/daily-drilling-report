import { asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { products } from "../products/products.schema";
import { reports } from "../reports/reports.schema";
import { wells } from "../wells/wells.schema";
import { type InsertInventory, inventories, type UpdateInventory } from "./inventories.schema";

export function inventoryService() {
  const service = {
    // Every row comes with its well, report and product details so the table needs no second
    // request. `final` is the stock left at the end of the report: it is computed here (never
    // stored, never recomputed in the web app) so it can't go stale when a quantity is edited.
    // Newest report first, then products by name.
    list: (reportId?: string) =>
      db
        .select({
          ...getTableColumns(inventories),
          wellId: reports.wellId,
          wellName: wells.name,
          reportNumber: reports.reportNumber,
          reportDate: reports.date,
          productName: products.name,
          productSize: products.size,
          productUnit: products.unit,
          final: sql<number>`${inventories.init} + ${inventories.received} - ${inventories.used} - ${inventories.returned}`,
        })
        .from(inventories)
        .innerJoin(reports, eq(reports.id, inventories.reportId))
        .innerJoin(wells, eq(wells.id, reports.wellId))
        .innerJoin(products, eq(products.id, inventories.productId))
        .where(reportId ? eq(inventories.reportId, reportId) : undefined)
        .orderBy(desc(reports.date), desc(reports.reportNumber), asc(products.name)),

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
