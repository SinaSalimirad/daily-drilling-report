import { PUMP_TYPES } from '@ddr/schemas';
import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { projects } from './projects';

export const pumpTypeEnum = pgEnum('pump_type', PUMP_TYPES);

/** Mud pumps. The output per stroke is calculated, never stored (docs/03). */
export const pumps = pgTable('pumps', {
  ...id,
  projectId: uuid()
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  model: text().notNull(),
  type: pumpTypeEnum().notNull(),
  /** m. */
  linerDiameter: doublePrecision().notNull(),
  /** m. */
  strokeLength: doublePrecision().notNull(),
  /** %. */
  efficiency: doublePrecision().notNull(),
  sortOrder: integer().notNull(),
  /** Set instead of deleting once a pump reading refers to the pump (docs/03). */
  archivedAt: timestamp({ withTimezone: true }),
  ...timestamps,
  ...authorship,
});
