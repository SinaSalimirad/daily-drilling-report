import { integer, numeric, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { numericConfig } from "@/lib/helpers/schema-fields";
import { products } from "../products/products.schema";
import { reports } from "../reports/reports.schema";

export const inventories = pgTable(
  "inventories",
  {
    id: uuidv7,
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),

    init: integer("init").notNull().default(0),
    used: integer("used").notNull().default(0),
    received: integer("received").notNull().default(0),
    returned: integer("returned").notNull().default(0),
    unitPrice: numeric("unit_price", numericConfig),
    note: text("note"),

    ...timestamps,
  },
  (table) => [unique("product_report_id_product_id_unique").on(table.reportId, table.productId)],
);

// Fields the client is allowed to send. id and timestamps are set by the database.
const inventoryInputFields = createInsertSchema(inventories, {
  reportId: z.uuid(),
  productId: z.uuid(),
  // Quantities: whole numbers, zero or greater. Optional because the DB defaults them to 0.
  init: (s) => s.int().nonnegative(),
  used: (s) => s.int().nonnegative(),
  received: (s) => s.int().nonnegative(),
  returned: (s) => s.int().nonnegative(),
  unitPrice: z.coerce.number().positive().nullish(),
  note: z.string().trim().nullish(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertInventorySchema = inventoryInputFields;

// PATCH body: every field is optional; only the fields that are sent get changed.
// reportId and productId can't be changed: create a new row instead.
export const updateInventorySchema = inventoryInputFields
  .omit({ reportId: true, productId: true })
  .partial();

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type UpdateInventory = z.infer<typeof updateInventorySchema>;
