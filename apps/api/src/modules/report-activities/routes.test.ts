import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// Activities of a report: replace, totals, present activity and the 24 h warning.

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

describe('/api/v1 report activities', () => {
  let reportId: string;
  let drilling: string;
  let tripping: string;

  beforeAll(async () => {
    const project = { name: 'SAVA', operator: 'POGC', currency: '$' };
    const projectId = (await call('POST', '/projects', project)).json.data.id;
    const well = { name: 'PYW-24ST1', wellType: 'vertical', rigType: 'onshore' };
    const wellId = (await call('POST', `/projects/${projectId}/wells`, well)).json.data.id;
    const section = { holeSize: 0.3111, fluidType: 'wbm' };
    const sectionId = (await call('POST', `/wells/${wellId}/sections`, section)).json.data.id;
    reportId = (
      await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: '2026-03-30' })
    ).json.data.id;
    const inserted = await testDb.db.execute<{ id: string }>(
      sql`insert into activities (name, sort_order) values ('Drilling', 1), ('Tripping', 2) returning id`,
    );
    [drilling, tripping] = inserted.rows.map((row) => row.id) as [string, string];
  });

  it('starts empty, with a warning', async () => {
    const { status, json } = await call('GET', `/reports/${reportId}/activities`);
    expect(status).toBe(200);
    expect(json.data).toEqual({ activities: [], totalHours: 0, presentActivity: null });
    expect(json.warnings[0].code).toBe('ACTIVITY_HOURS_NOT_24');
  });

  it('replaces the list, in order, with total hours and the present activity (last row)', async () => {
    const { status, json } = await call('PUT', `/reports/${reportId}/activities`, {
      activities: [
        { activityId: drilling, hours: 20.5 },
        { activityId: tripping, hours: 3.5 },
      ],
    });
    expect(status).toBe(200);
    expect(json.data.activities.map((a: { name: string }) => a.name)).toEqual([
      'Drilling',
      'Tripping',
    ]);
    expect(json.data).toMatchObject({ totalHours: 24, presentActivity: 'Tripping' });
    expect(json.warnings).toBeUndefined();

    const again = await call('PUT', `/reports/${reportId}/activities`, {
      activities: [{ activityId: tripping, hours: 2 }],
    });
    expect(again.json.data.activities).toHaveLength(1);
    expect(again.json.data.activities[0].sortOrder).toBe(1);
  });

  it('answers a total other than 24 h with a warning, not an error', async () => {
    const { status, json } = await call('PUT', `/reports/${reportId}/activities`, {
      activities: [{ activityId: drilling, hours: 23 }],
    });
    expect(status).toBe(200);
    expect(json.warnings).toEqual([
      expect.objectContaining({ code: 'ACTIVITY_HOURS_NOT_24', details: { totalHours: 23 } }),
    ]);
  });

  it('rejects an unknown activity, bad hours, and an unknown report', async () => {
    const unknown = await call('PUT', `/reports/${reportId}/activities`, {
      activities: [{ activityId: crypto.randomUUID(), hours: 1 }],
    });
    expect(unknown.status).toBe(422);
    expect(unknown.json.error.details[0].path).toBe('body.activities.0.activityId');
    const hours = await call('PUT', `/reports/${reportId}/activities`, {
      activities: [{ activityId: drilling, hours: 25 }],
    });
    expect(hours.status).toBe(422);
    const missing = await call('PUT', `/reports/${crypto.randomUUID()}/activities`, {
      activities: [],
    });
    expect(missing.status).toBe(404);
  });

  it('keeps the old list when a replacement is refused', async () => {
    const { json } = await call('GET', `/reports/${reportId}/activities`);
    expect(json.data.totalHours).toBe(23);
  });
});
