import { VOLUME_ITEMS } from '@ddr/schemas';
import { doublePrecision, pgEnum, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { pumps } from './pumps';
import { dailyReports } from './reports';

export const volumeItemEnum = pgEnum('volume_item', VOLUME_ITEMS);

/** SPM of one pump on one report (docs/03: `pump_readings`). */
export const pumpReadings = pgTable(
  'pump_readings',
  {
    ...id,
    reportId: uuid()
      .notNull()
      .references(() => dailyReports.id, { onDelete: 'cascade' }),
    pumpId: uuid()
      .notNull()
      .references(() => pumps.id, { onDelete: 'restrict' }),
    /** Strokes per minute. */
    spm: doublePrecision().notNull(),
    ...timestamps,
    ...authorship,
  },
  (table) => [unique('pump_readings_report_id_pump_id_unique').on(table.reportId, table.pumpId)],
);

/** One input item of the volume accounting on one report; derived items are never stored. */
export const volumeEntries = pgTable(
  'volume_entries',
  {
    ...id,
    reportId: uuid()
      .notNull()
      .references(() => dailyReports.id, { onDelete: 'cascade' }),
    item: volumeItemEnum().notNull(),
    /** m³. */
    volume: doublePrecision().notNull(),
    ...timestamps,
    ...authorship,
  },
  (table) => [unique('volume_entries_report_id_item_unique').on(table.reportId, table.item)],
);
