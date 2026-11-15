import { afterAll, describe, expect, it } from 'bun:test';
import { count } from 'drizzle-orm';
import { createApp } from '../../app';
import { env } from '../../config/env';
import { createDb } from '../../db/client';
import {
  activities,
  fluidSystems,
  type LookupTable,
  pitMudTypes,
  sampleSources,
} from '../../db/schema';
import { seedLookups } from '../../db/seed/lookups';
import {
  ACTIVITIES,
  FLUID_SYSTEMS,
  PIT_MUD_TYPES,
  SAMPLE_SOURCES,
} from '../../db/seed/lookups-data';

// Real PostgreSQL of DATABASE_URL, migrated (docs/09). The seed is idempotent, so the
// test may run it against a shared development database.

const { db, pool } = createDb(env.DATABASE_URL);
afterAll(() => pool.end());

const rows = async (table: LookupTable) => (await db.select({ n: count() }).from(table))[0]?.n;

describe('db:seed:lookups', () => {
  it('creates no duplicates when run twice', async () => {
    await seedLookups(db);
    await seedLookups(db);
    expect(await rows(sampleSources)).toBe(SAMPLE_SOURCES.length);
    expect(await rows(fluidSystems)).toBe(FLUID_SYSTEMS.length);
    expect(await rows(pitMudTypes)).toBe(PIT_MUD_TYPES.length);
    expect(await rows(activities)).toBe(ACTIVITIES.length);
  });
});

describe('GET /api/v1/lookups', () => {
  it('returns every list in one response, in workbook order', async () => {
    await seedLookups(db);
    const app = createApp({ log: { production: true, level: 'error', write: () => {} }, db });
    const res = await app.handle(new Request('http://localhost/api/v1/lookups'));
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      data: Record<string, { id: string; name: string }[]>;
    };
    expect(Object.keys(data).sort()).toEqual(
      ['activities', 'fluidSystems', 'pitMudTypes', 'sampleSources'].sort(),
    );
    expect(data.sampleSources?.map((s) => s.name)).toEqual(SAMPLE_SOURCES);
    expect(data.fluidSystems?.map((s) => s.name)).toEqual(FLUID_SYSTEMS);
    expect(data.pitMudTypes?.map((s) => s.name)).toEqual(PIT_MUD_TYPES);
    expect(data.activities?.map((s) => s.name)).toEqual(ACTIVITIES);
  });
});
