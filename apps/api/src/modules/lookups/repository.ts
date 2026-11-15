import { and, asc, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client';
import {
  activities,
  fluidSystems,
  type LookupTable,
  pitMudTypes,
  sampleSources,
} from '../../db/schema';

export type LookupItem = { id: string; name: string };

export const lookupsRepository = (db: Db) => {
  const active = (table: LookupTable): Promise<LookupItem[]> =>
    db
      .select({ id: table.id, name: table.name })
      .from(table)
      .where(isNull(table.archivedAt))
      .orderBy(asc(table.sortOrder), asc(table.name));

  const existing = async (table: LookupTable, ids: string[]): Promise<string[]> => {
    if (ids.length === 0) return [];
    const rows = await db
      .select({ id: table.id })
      .from(table)
      .where(and(inArray(table.id, ids), isNull(table.archivedAt)));
    return rows.map((row) => row.id);
  };

  return {
    activities: () => active(activities),
    sampleSources: () => active(sampleSources),
    fluidSystems: () => active(fluidSystems),
    pitMudTypes: () => active(pitMudTypes),

    /** Ids among the given ones that exist as unarchived activities. */
    existingActivityIds: (ids: string[]) => existing(activities, ids),

    /** Ids among the given ones that exist as unarchived fluid systems. */
    existingFluidSystemIds: (ids: string[]) => existing(fluidSystems, ids),

    /** Ids among the given ones that exist as unarchived pit mud types. */
    existingPitMudTypeIds: (ids: string[]) => existing(pitMudTypes, ids),
  };
};
