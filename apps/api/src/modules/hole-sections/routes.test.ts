import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { fromSI, toSI } from '@ddr/calc/units';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// Wellbore geometry: CRUD and the volumes (DMR-SAVA-010 gives 536.85 bbl at TD in the workbook;
// the exact value is 536.805 bbl, v0.8.5 rounds only in the display).

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

const m = (inches: number) => toSI(inches, 'in');

describe('/api/v1 hole sections', () => {
  let wellId: string;
  let casing: string;

  beforeAll(async () => {
    const projectId = (
      await call('POST', '/projects', { name: 'SAVA', operator: 'POGC', currency: '$' })
    ).json.data.id;
    wellId = (
      await call('POST', `/projects/${projectId}/wells`, {
        name: 'PYW-24ST1',
        wellType: 'directional',
        rigType: 'onshore',
      })
    ).json.data.id;
  });

  it('creates sections in order, in metres', async () => {
    const first = await call('POST', `/wells/${wellId}/hole-sections`, {
      type: 'casing',
      top: 0,
      bottom: 2283,
      outerDiameter: m(9.625),
      innerDiameter: m(8.625),
    });
    expect(first.status).toBe(201);
    expect(first.json.data).toMatchObject({ type: 'casing', bottom: 2283, sortOrder: 1 });
    casing = first.json.data.id;
    const second = await call('POST', `/wells/${wellId}/hole-sections`, {
      type: 'open_hole',
      top: 0,
      bottom: 2263,
      innerDiameter: m(8.375),
    });
    expect(second.json.data.sortOrder).toBe(2);
    const list = await call('GET', `/wells/${wellId}/hole-sections`);
    expect(list.json.data.map((s: { type: string }) => s.type)).toEqual(['casing', 'open_hole']);
  });

  it('gives the workbook hole volume and average diameter (day 10)', async () => {
    const { status, json } = await call('GET', `/wells/${wellId}/geometry?td=2263`);
    expect(status).toBe(200);
    expect(fromSI(json.data.totalVolume, 'bbl')).toBeCloseTo(536.805407, 5);
    expect(fromSI(json.data.averageDiameter, 'in')).toBeCloseTo(8.696835, 6);
    const deepest = await call('GET', `/wells/${wellId}/geometry`);
    expect(deepest.json.data.td).toBe(2283);
  });

  it('updates and deletes a section', async () => {
    const { json } = await call('PATCH', `/hole-sections/${casing}`, { bottom: 2000 });
    expect(json.data.bottom).toBe(2000);
    const spare = (
      await call('POST', `/wells/${wellId}/hole-sections`, {
        type: 'liner',
        top: 1900,
        bottom: 2300,
        innerDiameter: m(6),
      })
    ).json.data.id;
    expect((await call('DELETE', `/hole-sections/${spare}`)).status).toBe(204);
    expect((await call('DELETE', `/hole-sections/${spare}`)).status).toBe(404);
  });

  it('refuses an eleventh section and a missing diameter', async () => {
    for (let i = 0; i < 8; i++) {
      const ok = await call('POST', `/wells/${wellId}/hole-sections`, {
        type: 'liner',
        top: 100 + i,
        bottom: 200 + i,
        innerDiameter: m(5),
      });
      expect(ok.status).toBe(201);
    }
    const eleventh = await call('POST', `/wells/${wellId}/hole-sections`, {
      type: 'liner',
      top: 1,
      bottom: 2,
      innerDiameter: m(5),
    });
    expect(eleventh.status).toBe(422);
    const bad = await call('POST', `/wells/${wellId}/hole-sections`, {
      type: 'casing',
      top: 0,
      bottom: 1,
    });
    expect(bad.status).toBe(422);
  });

  it('answers 404 for an unknown well', async () => {
    expect((await call('GET', `/wells/${crypto.randomUUID()}/hole-sections`)).status).toBe(404);
  });
});
