import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { projects } from './projects';

export const pits = pgTable(
  'pits',
  {
    ...id,
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    name: text().notNull(),
    /** m³ (docs/03: measurements in SI, double precision). */
    capacity: doublePrecision().notNull(),
    sortOrder: integer().notNull(),
    /** Set instead of deleting once a reading refers to the pit (docs/03). */
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
    ...authorship,
  },
  (table) => [unique('pits_project_id_name_unique').on(table.projectId, table.name)],
);
