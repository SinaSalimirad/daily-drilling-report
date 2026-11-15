import { doublePrecision, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { wells } from './wells';

/** One drill string run of a well; a report points at the run that is in the hole. */
export const bhaRuns = pgTable(
  'bha_runs',
  {
    ...id,
    wellId: uuid()
      .notNull()
      .references(() => wells.id, { onDelete: 'restrict' }),
    runNo: integer().notNull(),
    bitType: text(),
    /** m. */
    bitSize: doublePrecision().notNull(),
    manufacturer: text(),
    /** m²; typed total flow area, when known. */
    knownTfa: doublePrecision(),
    /** Pa. */
    toolPressureLoss: doublePrecision(),
    ...timestamps,
    ...authorship,
  },
  (table) => [unique('bha_runs_well_id_run_no_unique').on(table.wellId, table.runNo)],
);

export const bitNozzles = pgTable('bit_nozzles', {
  ...id,
  runId: uuid()
    .notNull()
    .references(() => bhaRuns.id, { onDelete: 'cascade' }),
  /** 32nds of an inch. */
  size32: integer().notNull(),
  quantity: integer().notNull(),
  sortOrder: integer().notNull(),
  ...timestamps,
  ...authorship,
});

export const bhaComponents = pgTable('bha_components', {
  ...id,
  runId: uuid()
    .notNull()
    .references(() => bhaRuns.id, { onDelete: 'cascade' }),
  sortOrder: integer().notNull(),
  name: text().notNull(),
  /** m; null for the drill pipe, whose length follows from the bit depth. */
  length: doublePrecision(),
  /** m. */
  outerDiameter: doublePrecision().notNull(),
  /** m. */
  innerDiameter: doublePrecision().notNull(),
  ...timestamps,
  ...authorship,
});
