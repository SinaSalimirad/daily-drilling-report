import { integer, jsonb, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { user } from './auth';
import { dailyReports } from './reports';
import { wells } from './wells';

/** Wells an engineer or a client may work on (docs/07, "Scope"). Admin and coordinator are not limited by it. */
export const wellMembers = pgTable(
  'well_members',
  {
    ...id,
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    wellId: uuid()
      .notNull()
      .references(() => wells.id, { onDelete: 'cascade' }),
    ...timestamps,
    ...authorship,
  },
  (table) => [unique('well_members_user_id_well_id_unique').on(table.userId, table.wellId)],
);

/** One edit of a submitted report: who, when, the revision before and after, what changed (docs/07). */
export const auditLog = pgTable('audit_log', {
  ...id,
  reportId: uuid()
    .notNull()
    .references(() => dailyReports.id, { onDelete: 'cascade' }),
  userId: uuid().references(() => user.id, { onDelete: 'set null' }),
  action: text().notNull(),
  revisionBefore: integer().notNull(),
  revisionAfter: integer().notNull(),
  /** The fields of the request body, or the part of the report that was replaced. */
  changes: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
  ...authorship,
});
