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

  return {
    activities: () => active(activities),
    sampleSources: () => active(sampleSources),
    fluidSystems: () => active(fluidSystems),
    pitMudTypes: () => active(pitMudTypes),

    /** Ids among the given ones that exist as unarchived activities. */
    async existingActivityIds(ids: string[]): Promise<string[]> {
      if (ids.length === 0) return [];
      const rows = await db
        .select({ id: activities.id })
        .from(activities)
        .where(and(inArray(activities.id, ids), isNull(activities.archivedAt)));
      return rows.map((row) => row.id);
    },
  };
};
