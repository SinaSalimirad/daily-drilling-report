import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';

// Open lists of the workbook (docs/03: lookup tables, so they can grow without a
// migration). Seeded by `db:seed:lookups`; `name` is the natural key of the seed.

const lookupColumns = () => ({
  ...id,
  name: text().notNull().unique(),
  sortOrder: integer().notNull(),
  /** Referenced rows are archived, never deleted (docs/03). */
  archivedAt: timestamp({ withTimezone: true }),
  ...timestamps,
  ...authorship,
});

/** Activity dropdown of the daily report (workbook `FV8:FV68`). */
export const activities = pgTable('activities', lookupColumns());

/** "Sample from" dropdown of the mud sample (workbook `FB9:FB29`). */
export const sampleSources = pgTable('sample_sources', lookupColumns());

/** Active fluid system (workbook `MudPits(2)!T41:T55`). */
export const fluidSystems = pgTable('fluid_systems', lookupColumns());

/** Pit mud types: the pills and special fluids of `MudPits(2)!V41:V69`. */
export const pitMudTypes = pgTable('pit_mud_types', lookupColumns());

/** Any of the lookup tables (same columns, different names). */
export type LookupTable =
  | typeof activities
  | typeof sampleSources
  | typeof fluidSystems
  | typeof pitMudTypes;
