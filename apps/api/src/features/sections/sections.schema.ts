import { integer, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { wells } from "../wells/wells.schema";

export const sections = pgTable(
  "section",
  {
    id: uuidv7,
    wellId: uuid("well_id")
      .notNull()
      .references(() => wells.id),

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
