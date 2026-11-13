import { integer, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { requiredText } from "@/lib/helpers/schema-fields";
import { wells } from "../wells/wells.schema";

export const sections = pgTable(
  "section",
  {
    id: uuidv7,
    wellId: uuid("well_id")
      .notNull()
      .references(() => wells.id, { onDelete: "restrict" }),

    /**
     * `sequence` is the order of the sections within a well (unique per well).
     * Side-tracks and re-entry wells are not modelled yet; revisit this
     * when the hydraulics feature is implemented.
     */
    sequence: integer("sequence").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    ...timestamps,
  },
  (table) => [
    unique("sections_well_id_name_unique").on(table.wellId, table.name),
    unique("sections_well_id_sequence_unique").on(table.wellId, table.sequence),
    // Target of the composite FK in reports: proves "section belongs to the same well".
    unique("sections_id_well_id_unique").on(table.id, table.wellId),
  ],
);

// Fields the client is allowed to send. id and timestamps are set by the database.
const sectionInputFields = createInsertSchema(sections, {
  wellId: z.uuid(),
  sequence: z.coerce.number().int().positive(),
  name: requiredText,
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSectionSchema = sectionInputFields;

// PATCH body: every field is optional; only the fields that are sent get changed.
// wellId is not editable: reports point at (section, well), so moving a section
// to another well would break them.
export const updateSectionSchema = sectionInputFields.omit({ wellId: true }).partial();

export type InsertSection = z.infer<typeof insertSectionSchema>;
export type UpdateSection = z.infer<typeof updateSectionSchema>;
