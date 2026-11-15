import { PIT_TYPES } from '@ddr/schemas';
import { doublePrecision, pgEnum, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { pitMudTypes } from './lookups';
import { pits } from './pits';
import { dailyReports } from './reports';

export const pitTypeEnum = pgEnum('pit_type', PIT_TYPES);

/** Status of one pit on one report (docs/03: `unique (report_id, pit_id)`). */
export const pitReadings = pgTable(
  'pit_readings',
  {
    ...id,
    reportId: uuid()
      .notNull()
      .references(() => dailyReports.id, { onDelete: 'cascade' }),
    pitId: uuid()
      .notNull()
      .references(() => pits.id, { onDelete: 'restrict' }),
    pitType: pitTypeEnum().notNull(),
    /** m³. */
    volume: doublePrecision().notNull(),
    /** kg/m³. */
    mudWeight: doublePrecision(),
    mudTypeId: uuid().references(() => pitMudTypes.id, { onDelete: 'restrict' }),
    ...timestamps,
    ...authorship,
  },
  (table) => [unique('pit_readings_report_id_pit_id_unique').on(table.reportId, table.pitId)],
);
