import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { activities, fluidSystems, type LookupTable, pitMudTypes, sampleSources } from '../schema';
import { ACTIVITIES, FLUID_SYSTEMS, PIT_MUD_TYPES, SAMPLE_SOURCES } from './lookups-data';
import { runSeed } from './run';

// `bun run db:seed:lookups` — runs in every environment and is idempotent: rows are
// matched by name, so running it again only refreshes the order (docs/03).

async function upsert(db: Db, table: LookupTable, names: readonly string[]): Promise<number> {
  if (names.length === 0) return 0;
  const rows = names.map((name, index) => ({ name, sortOrder: index + 1 }));
  await db
    .insert(table)
    .values(rows)
    .onConflictDoUpdate({
      target: table.name,
      set: { sortOrder: sql`excluded.sort_order`, updatedAt: sql`now()` },
    });
  return rows.length;
}

export async function seedLookups(db: Db): Promise<number> {
  let written = 0;
  written += await upsert(db, activities, ACTIVITIES);
  written += await upsert(db, sampleSources, SAMPLE_SOURCES);
  written += await upsert(db, fluidSystems, FLUID_SYSTEMS);
  written += await upsert(db, pitMudTypes, PIT_MUD_TYPES);
  return written;
}

if (import.meta.main) await runSeed('lookups', seedLookups);
