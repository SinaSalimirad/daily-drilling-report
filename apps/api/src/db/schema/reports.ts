import { REPORT_STATUSES } from '@ddr/schemas';
import {
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { drillingSections } from './sections';
import { wells } from './wells';

export const reportStatusEnum = pgEnum('report_status', REPORT_STATUSES);

/** Daily drilling (mud) report of a well (docs/03, "Key constraints"). */
export const dailyReports = pgTable(
  'daily_reports',
  {
    ...id,
    wellId: uuid()
      .notNull()
      .references(() => wells.id, { onDelete: 'restrict' }),
    sectionId: uuid()
      .notNull()
      .references(() => drillingSections.id, { onDelete: 'restrict' }),
    reportNo: integer().notNull(),
    reportDate: date({ mode: 'string' }).notNull(),
    status: reportStatusEnum().notNull().default('draft'),
    /** Raised on every edit of a submitted report (docs/03, "Editing a submitted report"). */
    revision: integer().notNull().default(1),
    /** m. */
    bitDepth: doublePrecision(),
    /** m. */
    td: doublePrecision(),
    /** m. */
    tvd: doublePrecision(),
    representatives: text().array().notNull().default([]),
    engineers: text().array().notNull().default([]),
    drillingRemarks: text(),
    fluidRemarks: text(),
    formation: text(),
    submittedAt: timestamp({ withTimezone: true }),
    ...timestamps,
    ...authorship,
  },
  (table) => [
    unique('daily_reports_well_id_report_no_unique').on(table.wellId, table.reportNo),
    unique('daily_reports_well_id_report_date_unique').on(table.wellId, table.reportDate),
  ],
);
