import {
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { numericConfig, requiredText } from "@/lib/helpers/schema-fields";
import { sections } from "../sections/sections.schema";
import { wells } from "../wells/wells.schema";

export const reports = pgTable(
  "reports",
  {
    id: uuidv7,
    wellId: uuid("well_id")
      .notNull()
      .references(() => wells.id, { onDelete: "restrict" }),
    sectionId: uuid("section_id").notNull(),
    reportNumber: integer("report_number").notNull(),
    date: date("date").notNull(),

    operatorReporter: varchar("operator_reporter", { length: 255 }).notNull(),
    contractorReporter: varchar("contractor_reporter", { length: 255 }).notNull(),
    wellStatus: varchar("well_status", { length: 255 }).notNull(),
    mudType: varchar("mud_type", { length: 255 }).notNull(),
    presentActivity: varchar("present_activity", { length: 255 }).notNull(),
    bitDepth: numeric("bit_depth", numericConfig).notNull(),
    totalDepth: numeric("total_depth", numericConfig).notNull(),
    tvd: numeric("tvd", numericConfig).notNull(),

    ...timestamps,
  },
  (table) => [
    unique("reports_well_id_date_unique").on(table.wellId, table.date),
    unique("reports_well_id_report_number_unique").on(table.wellId, table.reportNumber),

    // Composite FK instead of column-level `.references()`: a column reference can only
    // point at sections.id, so it can't guarantee the section belongs to the same well.
    // Matching (section_id, well_id) against sections (id, well_id) enforces that.
    foreignKey({
      name: "reports_section_same_well_fk",
      columns: [table.sectionId, table.wellId],
      foreignColumns: [sections.id, sections.wellId],
    }).onDelete("restrict"),
  ],
);

// Fields the client is allowed to send. id and timestamps are set by the database.
const reportInputFields = createInsertSchema(reports, {
  wellId: z.uuid(),
  sectionId: z.uuid(),
  reportNumber: z.coerce.number().int().positive(), // Must be bigger than 0

  // The column is a Postgres `date` (string mode), so we validate a "YYYY-MM-DD" string, not a Date object.
  date: z.iso.date(),
  operatorReporter: requiredText,
  contractorReporter: requiredText,
  wellStatus: requiredText,
  mudType: requiredText,
  presentActivity: requiredText,
  bitDepth: z.coerce.number().positive(),
  totalDepth: z.coerce.number().positive(),
  tvd: z.coerce.number().positive(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertReportSchema = reportInputFields;

// PATCH body: every field is optional; only the fields that are sent get changed.
// wellId is not editable: the report belongs to that well. sectionId can change, but
// the composite FK still rejects a section from another well.
export const updateReportSchema = reportInputFields.omit({ wellId: true }).partial();

export type InsertReport = z.infer<typeof insertReportSchema>;
export type UpdateReport = z.infer<typeof updateReportSchema>;
