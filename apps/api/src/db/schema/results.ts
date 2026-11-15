import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authorship, timestamps } from '../columns';
import { dailyReports } from './reports';

/**
 * Result snapshot of a submitted report (docs/03: primary key `report_id`, columns
 * `revision`, `engine_version`, `is_stale`, `payload`). The only stored calculation: a
 * printed report must not change when a formula is fixed later.
 */
export const reportResults = pgTable('report_results', {
  reportId: uuid()
    .primaryKey()
    .references(() => dailyReports.id, { onDelete: 'cascade' }),
  /** Revision of the report the snapshot was calculated from. */
  revision: integer().notNull(),
  engineVersion: text().notNull(),
  /** Set when an earlier report of the well was edited; recalculated on first read. */
  isStale: boolean().notNull().default(false),
  payload: jsonb().$type<Record<string, unknown>>().notNull(),
  calculatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
  ...authorship,
});
