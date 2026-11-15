import { FLUID_TYPES } from '@ddr/schemas';
import { doublePrecision, integer, pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { fluidSystems } from './lookups';
import { wells } from './wells';

export const fluidTypeEnum = pgEnum('fluid_type', FLUID_TYPES);

/** Drilling section of a well: replaces the New Section macro (workbook F73:H75, AK3). */
export const drillingSections = pgTable('drilling_sections', {
  ...id,
  wellId: uuid()
    .notNull()
    .references(() => wells.id, { onDelete: 'restrict' }),
  /** m. */
  holeSize: doublePrecision().notNull(),
  fluidType: fluidTypeEnum().notNull(),
  fluidSystemId: uuid().references(() => fluidSystems.id, { onDelete: 'restrict' }),
  /** kg/m³. */
  planMudWeight: doublePrecision(),
  /** Pa. */
  planYieldPoint: doublePrecision(),
  /** mL per 30 min. */
  planFluidLoss: doublePrecision(),
  sortOrder: integer().notNull(),
  ...timestamps,
  ...authorship,
});
