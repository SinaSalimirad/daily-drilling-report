import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { requiredText } from "@/lib/helpers/schema-fields";

export enum CurrencyCode {
  Dollar = "USD",
  Pound = "GBP",
  Euro = "EUR",
  Yuan = "CNY",
  Rial = "IRR",
}

export enum RigType {
  Offshore = "offshore",
  Onshore = "onshore",
}

export const currencyCodeEnum = pgEnum("currency_code", CurrencyCode);
export const rigTypeEnum = pgEnum("rig_type", RigType);

export const projects = pgTable(
  "projects",
  {
    id: uuidv7,
    name: varchar("name", { length: 255 }).notNull().unique(),

    // A project can have 1 or 2 operators/contractors.
    operators: varchar("operators", { length: 255 }).array().notNull(),
    contractors: varchar("contractors", { length: 255 }).array().notNull(),
    field: varchar("field", { length: 255 }).notNull(),
    rigName: varchar("rig_name", { length: 255 }).notNull(),
    rigType: rigTypeEnum("rig_type").notNull(),

    // Prices of all products in this project are in this currency.
    currencyCode: currencyCodeEnum("currency_code").notNull(),
    ...timestamps,
  },
  (table) => [
    check("projects_operators_count_check", sql`cardinality(${table.operators}) BETWEEN 1 AND 2`),
    check(
      "projects_contractors_count_check",
      sql`cardinality(${table.contractors}) BETWEEN 1 AND 2`,
    ),
  ],
);

export const insertProjectSchema = createInsertSchema(projects, {
  name: requiredText,
  operators: z.array(requiredText).min(1).max(2),
  contractors: z.array(requiredText).min(1).max(2),
  field: requiredText,
  rigName: requiredText,
  rigType: z.enum(RigType),
  currencyCode: z.enum(CurrencyCode),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertProject = z.infer<typeof insertProjectSchema>;
