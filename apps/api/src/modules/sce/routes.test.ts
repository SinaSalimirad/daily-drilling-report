import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// Main path of the solids-control equipment module (docs/09), in a schema of its own.

let testDb: TestDb;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  testDb = await createTestDb();
  app = createApp({
    session: asAdmin,
    log: { production: true, level: 'error', write: () => {} },
    db: testDb.db,
  });
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

const shaker = (unitNumber: number) => ({
  type: 'Shale Shaker',
  unitNumber,
  manufacturer: 'Derrick',
  screenSize: 'API 140',
  model: 'FLC 503',
});

describe('/api/v1 sce-units', () => {
  let projectId: string;
  let firstId: string;

  beforeAll(async () => {
    const project = { name: 'SAVA', operator: 'POGC', currency: '$' };
    projectId = (await call('POST', '/projects', project)).json.data.id;
  });

  it('creates the workbook three shakers and a centrifuge', async () => {
    for (const n of [1, 2, 3]) {
      const { status, json } = await call('POST', `/projects/${projectId}/sce-units`, shaker(n));
      expect(status).toBe(201);
      expect(json.data).toMatchObject({ ...shaker(n), sortOrder: n });
      if (n === 1) firstId = json.data.id;
    }
    const centrifuge = await call('POST', `/projects/${projectId}/sce-units`, {
      type: 'Centrifuge',
    });
    expect(centrifuge.json.data).toMatchObject({
      unitNumber: null,
      manufacturer: null,
      sortOrder: 4,
    });
  });

  it('lists in a stable order, also when positions are equal', async () => {
    // Two units on the same position: the order must not change between calls.
    await call('PATCH', `/sce-units/${firstId}`, { sortOrder: 2 });
    const orders = [];
    for (let i = 0; i < 5; i++) {
      const { json } = await call('GET', `/projects/${projectId}/sce-units`);
      orders.push(json.data.map((u: { id: string }) => u.id).join());
    }
    expect(new Set(orders).size).toBe(1);
    const { json } = await call('GET', `/projects/${projectId}/sce-units`);
    expect(json.meta).toBeUndefined();
    expect(json.data.map((u: { sortOrder: number }) => u.sortOrder)).toEqual([2, 2, 3, 4]);
  });

  it('rejects an unknown field and a missing type', async () => {
    const bad = await call('POST', `/projects/${projectId}/sce-units`, { colour: 'red' });
    expect(bad.status).toBe(422);
    const paths = bad.json.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain('body.type');
  });

  it('deletes an unused unit and archives one that a usage row refers to', async () => {
    const spare = (await call('POST', `/projects/${projectId}/sce-units`, { type: 'Desilter' }))
      .json.data.id;
    expect((await call('DELETE', `/sce-units/${spare}`)).status).toBe(204);

    // Stands in for the daily equipment usage table (v0.3.0+).
    await testDb.db.execute(
      sql`create table usage_stub (sce_unit_id uuid not null references sce_units(id) on delete restrict)`,
    );
    await testDb.db.execute(sql`insert into usage_stub (sce_unit_id) values (${firstId})`);
    const { status, json } = await call('DELETE', `/sce-units/${firstId}`);
    expect(status).toBe(200);
    expect(json.data.archivedAt).toBeString();
  });

  it('answers 404 for an unknown project or unit', async () => {
    const missing = crypto.randomUUID();
    expect((await call('GET', `/projects/${missing}/sce-units`)).status).toBe(404);
    expect((await call('GET', `/sce-units/${missing}`)).json.error.message).toBe(
      'Solids-control unit not found',
    );
  });
});
