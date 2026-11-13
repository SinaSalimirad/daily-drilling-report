import { sql } from "drizzle-orm";
import { check, date, numeric, pgEnum, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { numericConfig, requiredText } from "@/lib/helpers/schema-fields";
import { projects } from "../projects/projects.schema";

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

export enum WellType {
  Directional = "Directional",
  Vertical = "Vertical",
}

export enum RigType {
  Offshore = "offshore",
  Onshore = "onshore",
}

export const designationEnum = pgEnum("wells_designationEnum", Designation);

export const wellTypeEnum = pgEnum("well_type", WellType);

export const rigTypeEnum = pgEnum("well_rigType", RigType);

export const wells = pgTable(
  "wells",
  {
    id: uuidv7,
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),

    name: varchar("name", { length: 255 }).notNull(),

    designation: designationEnum("designation").notNull(),
    spudDate: date("spud_date").notNull(),

    wellType: wellTypeEnum("well_type").notNull(),
    rigName: varchar("rig_name", { length: 255 }).notNull(),
    rigType: rigTypeEnum("rig_type").notNull(),

    // waterDepthM means `waterDepth` default unit is `meter`.
    waterDepthM: numeric("water_depth", numericConfig),
    ...timestamps,
  },
  (table) => [
    unique("wells_project_id_name_unique").on(table.projectId, table.name),
    unique("wells_id_project_id_unique").on(table.id, table.projectId),
    check("wells_water_depth_check", sql`${table.waterDepthM} IS NULL OR ${table.waterDepthM} > 0`),
  ],
);

export const insertWellSchema = createInsertSchema(wells, {
  projectId: z.uuid(),
  name: requiredText,
  designation: z.enum(Designation),
  spudDate: z.iso.date(),
  wellType: z.enum(WellType),
  rigName: requiredText,
  rigType: z.enum(RigType),
  waterDepthM: z.coerce.number().positive().nullish(),
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine((w) => (w.rigType === RigType.Offshore) === (w.waterDepthM != null), {
    path: ["waterDepthM"],
    message: "Water depth is required for offshore rigs and not allowed for onshore rigs",
  });

export type InsertWell = z.infer<typeof insertWellSchema>;
