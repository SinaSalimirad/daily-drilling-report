import { sql } from "drizzle-orm";
import { check, date, numeric, pgEnum, pgTable, unique, varchar } from "drizzle-orm/pg-core";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { numericConfig } from "@/lib/helpers/measurement";

export enum Designation {
  Exploration = "exploration",
  Cuttings = "cuttings",
  ReInjection = "re-injection",
  WorkOver = "work-over",
  Repairing = "repairing",
  ReEntry = "re-entry",
  NewLeg = "new leg",
  Perforation = "perforation",
  Plugging = "plugging",
}

export enum Currency {
  Dollar = "USD",
  Pound = "GBP",
  Euro = "EUR",
  Yuan = "CNY",
  Rial = "IRR",
}

export enum WellType {
  Directional = "Directional",
  Vertical = "Vertical",
}

export enum RigType {
  Offshore = "offshore",
  Onshore = "onshore",
}

export const designationEnum = pgEnum("wells_designationEnum", Designation);
export const currencyEnum = pgEnum("wells_currency", Currency);
export const wellTypeEnum = pgEnum("well_wellType", WellType);
export const rigTypeEnum = pgEnum("well_rigType", RigType);

export const wells = pgTable(
  "wells",
  {
    id: uuidv7,
    name: varchar("name", { length: 255 }).notNull(),
    // A well can have several operators/contractors (1 to 3).
    operators: varchar("operators", { length: 255 }).array().notNull(),
    contractors: varchar("contractors", { length: 255 }).array().notNull(),
    field: varchar("field", { length: 255 }).notNull(),
    designation: designationEnum("designation").notNull(),
    spudDate: date("spud_date").notNull(),
    currency: currencyEnum("currency").notNull(),
    wellType: wellTypeEnum("type").notNull(),
    rigName: varchar("rig_name", { length: 255 }).notNull(),
    rigType: rigTypeEnum("rig_type").notNull(),
    waterDepth: numeric("water_depth", numericConfig),
    ...timestamps,
  },
  (table) => [
    unique("wells_name_field_unique").on(table.name, table.field),

    check("wells_operators_count_check", sql`cardinality(${table.operators}) BETWEEN 1 AND 3`),
    check("wells_contractors_count_check", sql`cardinality(${table.contractors}) BETWEEN 1 AND 3`),

    // Offshore rigs must have a water depth; onshore rigs must not.
    check(
      "wells_water_depth_rig_type_check",
      sql`(${table.rigType} = 'offshore') = (${table.waterDepth} IS NOT NULL)`,
    ),
  ],
);
