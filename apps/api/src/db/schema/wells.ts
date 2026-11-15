import { RIG_TYPES, WELL_DESIGNATIONS, WELL_TYPES } from '@ddr/schemas';
import {
  date,
  doublePrecision,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { projects } from './projects';

// docs/03: closed lists are pgEnums; measurements are double precision in SI.

export const wellTypeEnum = pgEnum('well_type', WELL_TYPES);
export const rigTypeEnum = pgEnum('rig_type', RIG_TYPES);
export const wellDesignationEnum = pgEnum('well_designation', WELL_DESIGNATIONS);

export const wells = pgTable(
  'wells',
  {
    ...id,
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    name: text().notNull(),
    designation: wellDesignationEnum(),
    wellType: wellTypeEnum().notNull(),
    rigType: rigTypeEnum().notNull(),
    spudDate: date({ mode: 'string' }),
    /** m; offshore wells only. */
    waterDepth: doublePrecision(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
    ...authorship,
  },
  (table) => [unique('wells_project_id_name_unique').on(table.projectId, table.name)],
);
