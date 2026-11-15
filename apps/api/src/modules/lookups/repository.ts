import { asc, isNull } from 'drizzle-orm';
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
  };
};
