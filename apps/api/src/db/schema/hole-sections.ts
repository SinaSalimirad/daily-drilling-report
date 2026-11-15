import { SECTION_TYPES } from '@ddr/schemas';
import { doublePrecision, integer, pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { wells } from './wells';

export const sectionTypeEnum = pgEnum('section_type', SECTION_TYPES);

/** Wellbore geometry of a well, one row of the workbook's `WBG` (docs/03: `hole_sections`). */
export const holeSections = pgTable('hole_sections', {
  ...id,
  wellId: uuid()
    .notNull()
    .references(() => wells.id, { onDelete: 'restrict' }),
  type: sectionTypeEnum().notNull(),
  /** m. */
  top: doublePrecision().notNull(),
  /** m; 0 = down to the depth of the report. */
  bottom: doublePrecision().notNull(),
  /** m. */
  outerDiameter: doublePrecision(),
  /** m; bit diameter for an open hole. */
  innerDiameter: doublePrecision().notNull(),
  sortOrder: integer().notNull(),
  ...timestamps,
  ...authorship,
});
