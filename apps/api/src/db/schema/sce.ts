import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { projects } from './projects';

/** Solids-control equipment (docs/03 table name `sce_units`). */
export const sceUnits = pgTable('sce_units', {
  ...id,
  projectId: uuid()
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  type: text().notNull(),
  unitNumber: integer(),
  manufacturer: text(),
  screenSize: text(),
  model: text(),
  sortOrder: integer().notNull(),
  /** Set instead of deleting once a daily usage row refers to the unit (docs/03). */
  archivedAt: timestamp({ withTimezone: true }),
  ...timestamps,
  ...authorship,
});
