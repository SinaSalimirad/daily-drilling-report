import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Pit readings of a report: replace, rules, totals and carry-over to the next report.

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

describe('/api/v1 pit readings', () => {
  let projectId: string;
  let wellId: string;
  let sectionId: string;
  let report1: string;
  let active1: string;
  let reserve1: string;

  beforeAll(async () => {
    const project = { name: 'SAVA', operator: 'POGC', currency: '$' };
    projectId = (await call('POST', '/projects', project)).json.data.id;
    const well = { name: 'PYW-24ST1', wellType: 'vertical', rigType: 'onshore' };
    wellId = (await call('POST', `/projects/${projectId}/wells`, well)).json.data.id;
    sectionId = (
      await call('POST', `/wells/${wellId}/sections`, { holeSize: 0.3111, fluidType: 'wbm' })
    ).json.data.id;
    active1 = (
      await call('POST', `/projects/${projectId}/pits`, { name: 'Active 1', capacity: 30 })
    ).json.data.id;
    reserve1 = (
      await call('POST', `/projects/${projectId}/pits`, { name: 'Reserve 1', capacity: 50 })
    ).json.data.id;
    report1 = (
      await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: '2026-03-30' })
    ).json.data.id;
  });

  it('replaces the readings and totals the volume per pit type', async () => {
    const { status, json } = await call('PUT', `/reports/${report1}/pit-readings`, {
      readings: [
        { pitId: active1, pitType: 'active', volume: 25.5, mudWeight: 1200 },
        { pitId: reserve1, pitType: 'reserve', volume: 40 },
      ],
    });
    expect(status).toBe(200);
    expect(json.data.readings.map((r: { pitName: string }) => r.pitName)).toEqual([
      'Active 1',
      'Reserve 1',
    ]);
    expect(json.data.totals).toEqual({ active: 25.5, reserve: 40, notMud: 0 });
    expect(json.data.readings[0]).toMatchObject({ mudWeight: 1200, mudTypeId: null });
  });

  it('refuses a volume above the capacity (PIT_VOLUME_OVER_CAPACITY)', async () => {
    const { status, json } = await call('PUT', `/reports/${report1}/pit-readings`, {
      readings: [{ pitId: active1, pitType: 'active', volume: 30.1 }],
    });
    expect(status).toBe(422);
    expect(json.error.code).toBe('PIT_VOLUME_OVER_CAPACITY');
    const ok = await call('PUT', `/reports/${report1}/pit-readings`, {
      readings: [{ pitId: active1, pitType: 'active', volume: 30 }],
    });
    expect(ok.status).toBe(200);
  });

  it('keeps mud weight within 0.5–2.6 × water density (MUD_WEIGHT_OUT_OF_RANGE)', async () => {
    for (const mudWeight of [499, 2601]) {
      const { status, json } = await call('PUT', `/reports/${report1}/pit-readings`, {
        readings: [{ pitId: active1, pitType: 'active', volume: 10, mudWeight }],
      });
      expect(status).toBe(422);
      expect(json.error.code).toBe('MUD_WEIGHT_OUT_OF_RANGE');
    }
    for (const mudWeight of [500, 2600]) {
      const { status } = await call('PUT', `/reports/${report1}/pit-readings`, {
        readings: [{ pitId: active1, pitType: 'active', volume: 10, mudWeight }],
      });
      expect(status).toBe(200);
    }
  });

  it('rejects a repeated pit, a pit of another project and an unknown mud type', async () => {
    const twice = await call('PUT', `/reports/${report1}/pit-readings`, {
      readings: [
        { pitId: active1, pitType: 'active', volume: 1 },
        { pitId: active1, pitType: 'reserve', volume: 1 },
      ],
    });
    expect(twice.json.error.details[0].path).toBe('body.readings.1.pitId');
    const other = (await call('POST', '/projects', { name: 'Other', operator: 'X', currency: '$' }))
      .json.data.id;
    const foreign = (await call('POST', `/projects/${other}/pits`, { name: 'F', capacity: 5 })).json
      .data.id;
    const wrong = await call('PUT', `/reports/${report1}/pit-readings`, {
      readings: [{ pitId: foreign, pitType: 'active', volume: 1 }],
    });
    expect(wrong.status).toBe(422);
    expect(wrong.json.error.details[0].path).toBe('body.readings.0.pitId');
    const mud = await call('PUT', `/reports/${report1}/pit-readings`, {
      readings: [{ pitId: active1, pitType: 'active', volume: 1, mudTypeId: crypto.randomUUID() }],
    });
    expect(mud.json.error.details[0].path).toBe('body.readings.0.mudTypeId');
  });

  it('starts a new report with the readings of the previous one', async () => {
    await call('PUT', `/reports/${report1}/pit-readings`, {
      readings: [
        { pitId: active1, pitType: 'active', volume: 22, mudWeight: 1250 },
        { pitId: reserve1, pitType: 'reserve', volume: 41 },
      ],
    });
    const second = await call('POST', `/wells/${wellId}/reports`, { sectionId });
    const { json } = await call('GET', `/reports/${second.json.data.id}/pit-readings`);
    expect(json.data.totals).toEqual({ active: 22, reserve: 41, notMud: 0 });
    expect(json.data.readings[0]).toMatchObject({ pitName: 'Active 1', mudWeight: 1250 });

    // Editing the new day does not change the old one.
    await call('PUT', `/reports/${second.json.data.id}/pit-readings`, { readings: [] });
    const old = await call('GET', `/reports/${report1}/pit-readings`);
    expect(old.json.data.readings).toHaveLength(2);
  });

  it('answers 404 for an unknown report', async () => {
    const missing = crypto.randomUUID();
    expect((await call('GET', `/reports/${missing}/pit-readings`)).status).toBe(404);
  });
});
