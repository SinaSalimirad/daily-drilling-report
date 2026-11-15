import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { fromSI, toSI } from '@ddr/calc/units';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Main path of the pumps module (docs/09), in a schema of its own.

let testDb: TestDb;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  testDb = await createTestDb();
  app = createApp({ log: { production: true, level: 'error', write: () => {} }, db: testDb.db });
});
afterAll(() => testDb.drop());

// biome-ignore lint/suspicious/noExplicitAny: tests read untyped JSON bodies
type Json = any;

async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Json }> {
  const res = await app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : undefined };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Workbook PEquip pump 1: triplex, liner 6 in, stroke 12 in, 95 %; sent in SI. */
const workbookPump = {
  model: 'F-1600',
  type: 'triplex',
  linerDiameter: toSI(6, 'in'),
  strokeLength: toSI(12, 'in'),
  efficiency: 95,
};

describe('/api/v1 pumps', () => {
  let projectId: string;
  let pumpId: string;

  beforeAll(async () => {
    const project = { name: 'SAVA', operator: 'POGC', currency: '$' };
    projectId = (await call('POST', '/projects', project)).json.data.id;
  });

  it('returns the output per stroke in m³ with each pump (4.19 gal golden case)', async () => {
    const { status, json } = await call('POST', `/projects/${projectId}/pumps`, workbookPump);
    expect(status).toBe(201);
    expect(json.data).toMatchObject({ ...workbookPump, sortOrder: 1 });
    expect(round2(fromSI(json.data.outputPerStroke, 'gal'))).toBe(4.19);
    pumpId = json.data.id;
  });

  it('recalculates the output when the liner changes (6.5 in → 4.91 gal)', async () => {
    const { json } = await call('PATCH', `/pumps/${pumpId}`, { linerDiameter: toSI(6.5, 'in') });
    expect(round2(fromSI(json.data.outputPerStroke, 'gal'))).toBe(4.91);
  });

  it('lists the whole collection with outputs', async () => {
    await call('POST', `/projects/${projectId}/pumps`, { ...workbookPump, type: 'duplex' });
    const { json } = await call('GET', `/projects/${projectId}/pumps`);
    expect(json.meta).toBeUndefined();
    expect(json.data.map((p: { type: string }) => p.type)).toEqual(['triplex', 'duplex']);
    expect(json.data.every((p: { outputPerStroke: number }) => p.outputPerStroke > 0)).toBe(true);
  });

  it('rejects an efficiency above 100 % and a zero liner', async () => {
    const bad = await call('POST', `/projects/${projectId}/pumps`, {
      ...workbookPump,
      efficiency: 120,
      linerDiameter: 0,
    });
    expect(bad.status).toBe(422);
    const paths = bad.json.error.details.map((d: { path: string }) => d.path).sort();
    expect(paths).toEqual(['body.efficiency', 'body.linerDiameter']);
  });

  it('deletes an unused pump and archives one that a reading refers to', async () => {
    const spare = (await call('POST', `/projects/${projectId}/pumps`, workbookPump)).json.data.id;
    expect((await call('DELETE', `/pumps/${spare}`)).status).toBe(204);

    // Stands in for pump_readings (v0.5.0).
    await testDb.db.execute(
      sql`create table readings_stub (pump_id uuid not null references pumps(id))`,
    );
    await testDb.db.execute(sql`insert into readings_stub (pump_id) values (${pumpId})`);
    const { status, json } = await call('DELETE', `/pumps/${pumpId}`);
    expect(status).toBe(200);
    expect(json.data.archivedAt).toBeString();
  });

  it('answers 404 for an unknown project or pump', async () => {
    const missing = crypto.randomUUID();
    expect((await call('POST', `/projects/${missing}/pumps`, workbookPump)).status).toBe(404);
    expect((await call('GET', `/pumps/${missing}`)).json.error.message).toBe('Pump not found');
  });
});
