import { doublePrecision, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { wells } from './wells';

/** One station of the directional survey of a well (docs/03: `unique (well_id, measured_depth)`). */
export const surveyStations = pgTable(
  'survey_stations',
  {
    ...id,
    wellId: uuid()
      .notNull()
      .references(() => wells.id, { onDelete: 'restrict' }),
    /** m. */
    measuredDepth: doublePrecision().notNull(),
    /** Degrees. */
    inclination: doublePrecision().notNull(),
    /** Degrees. */
    azimuth: doublePrecision().notNull(),
    ...timestamps,
    ...authorship,
  },
  (table) => [
    unique('survey_stations_well_id_measured_depth_unique').on(table.wellId, table.measuredDepth),
  ],
);
