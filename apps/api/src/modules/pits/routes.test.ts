import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Main path of the pits module (docs/09), in a schema of its own.

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

describe('/api/v1 pits', () => {
  let projectId: string;
  let active1: string;

  beforeAll(async () => {
    const project = { name: 'SAVA', operator: 'POGC', currency: '$' };
    projectId = (await call('POST', '/projects', project)).json.data.id;
  });

  it('creates pits in order, with capacity in m³', async () => {
    const first = await call('POST', `/projects/${projectId}/pits`, {
      name: 'Active 1',
      capacity: 23.85,
    });
    expect(first.status).toBe(201);
    expect(first.json.data).toMatchObject({ name: 'Active 1', capacity: 23.85, sortOrder: 1 });
    active1 = first.json.data.id;
    const second = await call('POST', `/projects/${projectId}/pits`, {
      name: 'Reserve 1',
      capacity: 47.7,
    });
    expect(second.json.data.sortOrder).toBe(2);

    const stored = await testDb.db.execute<{ capacity: number }>(
      sql`select capacity from pits where id = ${active1}`,
    );
    expect(stored.rows[0]?.capacity).toBe(23.85);
  });

  it('lists the whole collection in order, without meta', async () => {
    const { status, json } = await call('GET', `/projects/${projectId}/pits`);
    expect(status).toBe(200);
    expect(json.meta).toBeUndefined();
    expect(json.data.map((p: { name: string }) => p.name)).toEqual(['Active 1', 'Reserve 1']);
  });

  it('updates a pit', async () => {
    const { json } = await call('PATCH', `/pits/${active1}`, { capacity: 30, sortOrder: 5 });
    expect(json.data).toMatchObject({ capacity: 30, sortOrder: 5 });
  });

  it('rejects a zero capacity and a duplicate name', async () => {
    const zero = await call('POST', `/projects/${projectId}/pits`, { name: 'X', capacity: 0 });
    expect(zero.status).toBe(422);
    expect(zero.json.error.details[0].path).toBe('body.capacity');
    const duplicate = await call('POST', `/projects/${projectId}/pits`, {
      name: 'Active 1',
      capacity: 1,
    });
    expect(duplicate.status).toBe(409);
  });

  it('deletes an unused pit (204)', async () => {
    const spare = (
      await call('POST', `/projects/${projectId}/pits`, { name: 'Spare', capacity: 5 })
    ).json.data.id;
    const { status } = await call('DELETE', `/pits/${spare}`);
    expect(status).toBe(204);
    expect((await call('GET', `/pits/${spare}`)).status).toBe(404);
  });

  it('archives a pit that a reading refers to, instead of deleting it', async () => {
    // Stands in for pit_readings (v0.3.0): any row with a foreign key to the pit.
    await testDb.db.execute(
      sql`create table readings_stub (pit_id uuid not null references pits(id))`,
    );
    await testDb.db.execute(sql`insert into readings_stub (pit_id) values (${active1})`);

    const { status, json } = await call('DELETE', `/pits/${active1}`);
    expect(status).toBe(200);
    expect(json.data.archivedAt).toBeString();
    expect((await call('GET', `/pits/${active1}`)).status).toBe(200);
    const active = await call('GET', `/projects/${projectId}/pits`);
    expect(active.json.data.map((p: { id: string }) => p.id)).not.toContain(active1);
    const archived = await call('GET', `/projects/${projectId}/pits?archived=true`);
    expect(archived.json.data.map((p: { id: string }) => p.id)).toEqual([active1]);
  });

  it('answers 404 for an unknown project or pit', async () => {
    const missing = crypto.randomUUID();
    expect((await call('GET', `/projects/${missing}/pits`)).status).toBe(404);
    expect((await call('DELETE', `/pits/${missing}`)).json.error.message).toBe('Pit not found');
  });
});
