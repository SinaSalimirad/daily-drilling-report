import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Main path of the drilling sections module (docs/09), in a schema of its own.

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

describe('/api/v1 sections', () => {
  let wellId: string;
  let first: string;

  beforeAll(async () => {
    const project = { name: 'SAVA', operator: 'POGC', currency: '$' };
    const projectId = (await call('POST', '/projects', project)).json.data.id;
    const well = { name: 'PYW-24ST1', wellType: 'directional', rigType: 'onshore' };
    wellId = (await call('POST', `/projects/${projectId}/wells`, well)).json.data.id;
  });

  it('creates sections in order, with SI values', async () => {
    const created = await call('POST', `/wells/${wellId}/sections`, {
      holeSize: 0.3111,
      fluidType: 'wbm',
      planMudWeight: 1200,
      planYieldPoint: 9.58,
      planFluidLoss: 6,
    });
    expect(created.status).toBe(201);
    expect(created.json.data).toMatchObject({
      holeSize: 0.3111,
      sortOrder: 1,
      planMudWeight: 1200,
    });
    first = created.json.data.id;
    const second = await call('POST', `/wells/${wellId}/sections`, {
      holeSize: 0.2159,
      fluidType: 'wbm',
    });
    expect(second.json.data).toMatchObject({ sortOrder: 2, planMudWeight: null });

    const stored = await testDb.db.execute<{ hole_size: number }>(
      sql`select hole_size from drilling_sections where id = ${first}`,
    );
    expect(stored.rows[0]?.hole_size).toBe(0.3111);
  });

  it('returns the sections of a well in order', async () => {
    await call('PATCH', `/sections/${first}`, { sortOrder: 9 });
    const { status, json } = await call('GET', `/wells/${wellId}/sections`);
    expect(status).toBe(200);
    expect(json.meta).toBeUndefined();
    expect(json.data.map((s: { holeSize: number }) => s.holeSize)).toEqual([0.2159, 0.3111]);
  });

  it('rejects a zero hole size and an unknown fluid type', async () => {
    const zero = await call('POST', `/wells/${wellId}/sections`, { holeSize: 0, fluidType: 'wbm' });
    expect(zero.status).toBe(422);
    expect(zero.json.error.details[0].path).toBe('body.holeSize');
    const fluid = await call('POST', `/wells/${wellId}/sections`, { holeSize: 1, fluidType: 'x' });
    expect(fluid.status).toBe(422);
  });

  it('deletes an unused section (204)', async () => {
    const spare = (
      await call('POST', `/wells/${wellId}/sections`, { holeSize: 0.1, fluidType: 'brine' })
    ).json.data.id;
    expect((await call('DELETE', `/sections/${spare}`)).status).toBe(204);
    expect((await call('GET', `/sections/${spare}`)).status).toBe(404);
  });

  it('refuses to delete a section that a report refers to (409 IN_USE)', async () => {
    const report = await call('POST', `/wells/${wellId}/reports`, {
      sectionId: first,
      reportDate: '2026-01-01',
    });
    expect(report.status).toBe(201);
    const { status, json } = await call('DELETE', `/sections/${first}`);
    expect(status).toBe(409);
    expect(json.error.code).toBe('IN_USE');
  });

  it('answers an unknown fluid system with 422, not IN_USE', async () => {
    const body = { holeSize: 0.2, fluidType: 'wbm', fluidSystemId: crypto.randomUUID() };
    const created = await call('POST', `/wells/${wellId}/sections`, body);
    expect(created.status).toBe(422);
    expect(created.json.error.details[0].path).toBe('body.fluidSystemId');
    const patched = await call('PATCH', `/sections/${first}`, {
      fluidSystemId: body.fluidSystemId,
    });
    expect(patched.status).toBe(422);

    const system = await testDb.db.execute<{ id: string }>(
      sql`insert into fluid_systems (name, sort_order) values ('KCl', 1) returning id`,
    );
    const known = await call('PATCH', `/sections/${first}`, {
      fluidSystemId: system.rows[0]?.id,
    });
    expect(known.status).toBe(200);
  });

  it('answers 404 for an unknown well or section', async () => {
    const missing = crypto.randomUUID();
    expect((await call('GET', `/wells/${missing}/sections`)).status).toBe(404);
    expect((await call('PATCH', `/sections/${missing}`, { holeSize: 1 })).status).toBe(404);
  });
});
