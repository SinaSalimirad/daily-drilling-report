import { UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import type { UnitSystem } from '@ddr/schemas';
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';

// docs/03: master data is archived (`archived_at`), not deleted, once a report refers to it.

export const projects = pgTable('projects', {
  ...id,
  name: text().notNull().unique(),
  operator: text().notNull(),
  contractor: text(),
  rigName: text(),
  fieldCountry: text(),
  currency: text().notNull(),
  /** Display units only; values are always stored in SI (docs/03). Default: SI preset. */
  unitSystem: jsonb().$type<UnitSystem>().notNull().default(UNIT_SYSTEM_PRESETS.si),
  archivedAt: timestamp({ withTimezone: true }),
  ...timestamps,
  ...authorship,
});
