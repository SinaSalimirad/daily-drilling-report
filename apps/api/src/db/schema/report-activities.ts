import { doublePrecision, integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { activities } from './lookups';
import { dailyReports } from './reports';

/** Activities and hours of one report (workbook DMR activity rows). */
export const reportActivities = pgTable('report_activities', {
  ...id,
  reportId: uuid()
    .notNull()
    .references(() => dailyReports.id, { onDelete: 'cascade' }),
  activityId: uuid()
    .notNull()
    .references(() => activities.id, { onDelete: 'restrict' }),
  /** Hours. */
  hours: doublePrecision().notNull(),
  sortOrder: integer().notNull(),
  ...timestamps,
  ...authorship,
});
