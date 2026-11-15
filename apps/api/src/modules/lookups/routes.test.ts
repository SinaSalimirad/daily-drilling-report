import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { count, eq, isNull } from 'drizzle-orm';
import { createApp } from '../../app';
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
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// In a schema of its own (test/db.ts), so the development data is not touched.

let testDb: TestDb;
beforeAll(async () => {
  testDb = await createTestDb();
});
afterAll(() => testDb.drop());

const active = async (table: LookupTable) =>
  (await testDb.db.select({ n: count() }).from(table).where(isNull(table.archivedAt)))[0]?.n;
const all = async (table: LookupTable) =>
  (await testDb.db.select({ n: count() }).from(table))[0]?.n;

describe('lookup lists (workbook report 1)', () => {
  it('activities: 56 distinct fixed names and the 3 custom ones, trimmed, no duplicates', () => {
    expect(ACTIVITIES).toHaveLength(59);
    expect(new Set(ACTIVITIES).size).toBe(ACTIVITIES.length);
    expect(ACTIVITIES.every((name) => name === name.trim())).toBe(true);
    expect(ACTIVITIES[0]).toBe('Back Reaming');
    expect(ACTIVITIES.slice(-3)).toEqual(['SPUD THE RIG', 'Work on Stuck', 'Reaming']);
  });

  it('pit mud types: the 29 names of MudPits(2)!V41:V69', () => {
    expect(PIT_MUD_TYPES).toHaveLength(29);
    expect(PIT_MUD_TYPES).toContain('PHG PILL');
    expect(PIT_MUD_TYPES).not.toContain('Fresh Water');
    expect(PIT_MUD_TYPES.at(-1)).toBe('Invert Emulsion Mud');
  });
});

describe('db:seed:lookups', () => {
  it('creates no duplicates when run twice', async () => {
    await seedLookups(testDb.db);
    await seedLookups(testDb.db);
    expect(await all(sampleSources)).toBe(SAMPLE_SOURCES.length);
    expect(await all(fluidSystems)).toBe(FLUID_SYSTEMS.length);
    expect(await all(pitMudTypes)).toBe(PIT_MUD_TYPES.length);
    expect(await all(activities)).toBe(ACTIVITIES.length);
  });

  it('archives a name that left the list and restores it when it comes back', async () => {
    await testDb.db.insert(pitMudTypes).values({ name: 'PHG', sortOrder: 99 });
    await seedLookups(testDb.db);
    const [old] = await testDb.db.select().from(pitMudTypes).where(eq(pitMudTypes.name, 'PHG'));
    expect(old?.archivedAt).toBeInstanceOf(Date);
    expect(await active(pitMudTypes)).toBe(PIT_MUD_TYPES.length);

    await testDb.db
      .update(pitMudTypes)
      .set({ archivedAt: new Date() })
      .where(eq(pitMudTypes.name, 'PHG PILL'));
    await seedLookups(testDb.db);
    const [back] = await testDb.db
      .select()
      .from(pitMudTypes)
      .where(eq(pitMudTypes.name, 'PHG PILL'));
    expect(back?.archivedAt).toBeNull();
  });
});

describe('GET /api/v1/lookups', () => {
  it('returns every active list in one response, in workbook order', async () => {
    await seedLookups(testDb.db);
    const app = createApp({
      session: asAdmin,
      log: { production: true, level: 'error', write: () => {} },
      db: testDb.db,
    });
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
