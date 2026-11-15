import { and, isNull, notInArray, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { activities, fluidSystems, type LookupTable, pitMudTypes, sampleSources } from '../schema';
import { ACTIVITIES, FLUID_SYSTEMS, PIT_MUD_TYPES, SAMPLE_SOURCES } from './lookups-data';
import { runSeed } from './run';

// `bun run db:seed:lookups` — runs in every environment and is idempotent (docs/03).
// Each table is synced with its list, matched by name:
// - a listed name is inserted, or its order refreshed and an earlier archive undone;
// - a name no longer listed is archived, never deleted (reports may refer to it).

async function sync(db: Db, table: LookupTable, names: readonly string[]): Promise<number> {
  if (names.length === 0) return 0;
  const rows = names.map((name, index) => ({ name, sortOrder: index + 1 }));
  await db
    .insert(table)
    .values(rows)
    .onConflictDoUpdate({
      target: table.name,
      set: { sortOrder: sql`excluded.sort_order`, archivedAt: null, updatedAt: sql`now()` },
    });
  await db
    .update(table)
    .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(notInArray(table.name, [...names]), isNull(table.archivedAt)));
  return rows.length;
}

export async function seedLookups(db: Db): Promise<number> {
  let written = 0;
  written += await sync(db, activities, ACTIVITIES);
  written += await sync(db, sampleSources, SAMPLE_SOURCES);
  written += await sync(db, fluidSystems, FLUID_SYSTEMS);
  written += await sync(db, pitMudTypes, PIT_MUD_TYPES);
  return written;
}

if (import.meta.main) await runSeed('lookups', seedLookups);
