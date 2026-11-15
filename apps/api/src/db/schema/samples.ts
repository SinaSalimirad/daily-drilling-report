import { doublePrecision, integer, jsonb, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { sampleSources } from './lookups';
import { dailyReports } from './reports';

/** A mud sample of a report (docs/03: `unique (report_id, seq)`). */
export const mudSamples = pgTable(
  'mud_samples',
  {
    ...id,
    reportId: uuid()
      .notNull()
      .references(() => dailyReports.id, { onDelete: 'cascade' }),
    seq: integer().notNull(),
    sampleSourceId: uuid().references(() => sampleSources.id, { onDelete: 'restrict' }),
    /** `HH:MM`. */
    sampleTime: text(),
    /** °C. */
    flowlineTemp: doublePrecision(),
    /** m. */
    depth: doublePrecision(),
    /** kg/m³. */
    mudWeight: doublePrecision(),
    /** °C. */
    mudTemp: doublePrecision(),
    /** Seconds per quart. */
    funnelViscosity: doublePrecision(),
    /** °C. */
    rheologyTemp: doublePrecision(),
    r600: doublePrecision(),
    r300: doublePrecision(),
    r200: doublePrecision(),
    r100: doublePrecision(),
    r6: doublePrecision(),
    r3: doublePrecision(),
    /** Pa. */
    gel10s: doublePrecision(),
    gel10m: doublePrecision(),
    gel30m: doublePrecision(),
    /** mL / 30 min. */
    apiFluidLoss: doublePrecision(),
    /** % vol. */
    oil: doublePrecision(),
    water: doublePrecision(),
    solids: doublePrecision(),
    sand: doublePrecision(),
    /** kg/m³. */
    mbt: doublePrecision(),
    /** kg/m³. */
    chlorides: doublePrecision(),
    /** Template-specific properties of the mud system (docs/03: jsonb for sample properties). */
    otherProperties: jsonb().$type<Record<string, number | string>>().notNull().default({}),
    ...timestamps,
    ...authorship,
  },
  (table) => [unique('mud_samples_report_id_seq_unique').on(table.reportId, table.seq)],
);
