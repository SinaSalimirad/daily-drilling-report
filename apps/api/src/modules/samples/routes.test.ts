import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { fromSI, toSI } from '@ddr/calc/units';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Mud samples, derived PV / YP, brine results and plan versus actual (DMR-SAVA-010 sample 1).

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

describe('/api/v1 samples', () => {
  let reportId: string;
  let source: string;
  const sample1 = {
    sampleTime: '08:00',
    mudWeight: toSI(130, 'pcf'),
    funnelViscosity: 41,
    r600: 84,
    r300: 48,
    r100: 36,
    r3: 3,
    apiFluidLoss: 3.2,
    solids: 37,
    chlorides: toSI(177000, 'mg_l'),
    otherProperties: { pH: 9.6, Pm: 0.5 },
  };

  beforeAll(async () => {
    const projectId = (
      await call('POST', '/projects', { name: 'SAVA', operator: 'POGC', currency: '$' })
    ).json.data.id;
    const wellId = (
      await call('POST', `/projects/${projectId}/wells`, {
        name: 'W1',
        wellType: 'vertical',
        rigType: 'onshore',
      })
    ).json.data.id;
    const sectionId = (
      await call('POST', `/wells/${wellId}/sections`, {
        holeSize: 0.2,
        fluidType: 'wbm',
        planMudWeight: toSI(125, 'pcf'),
        planYieldPoint: toSI(10, 'lbf_100ft2'),
        planFluidLoss: 4,
      })
    ).json.data.id;
    reportId = (
      await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: '2026-08-06' })
    ).json.data.id;
    source = (
      await testDb.db.execute<{ id: string }>(
        sql`insert into sample_sources (name, sort_order) values ('Flowline', 1) returning id`,
      )
    ).rows[0]?.id as string;
  });

  it('is empty at first, with the plan of the section', async () => {
    const { status, json } = await call('GET', `/reports/${reportId}/samples`);
    expect(status).toBe(200);
    expect(json.data.samples).toEqual([]);
    expect(json.data.latest).toBeNull();
    expect(fromSI(json.data.plan.planned.mudWeight, 'pcf')).toBeCloseTo(125, 9);
  });

  it('derives PV 36 cP and YP 12 lb/100 ft² (workbook day 10), power law and brine', async () => {
    const { status, json } = await call('PUT', `/reports/${reportId}/samples`, {
      samples: [{ ...sample1, sampleSourceId: source }],
    });
    expect(status).toBe(200);
    const [sample] = json.data.samples;
    expect(sample.seq).toBe(1);
    expect(fromSI(sample.plasticViscosity, 'cp')).toBeCloseTo(36, 9);
    expect(fromSI(sample.yieldPoint, 'lbf_100ft2')).toBeCloseTo(12, 9);
    expect(sample.otherProperties).toEqual({ pH: 9.6, Pm: 0.5 });
    const { latest } = json.data;
    expect(latest.pipe.n).toBeCloseTo(0.8069, 4);
    expect(latest.annulus.n).toBeGreaterThan(0);
    expect(latest.brineDensity).toBe(1.188);
    expect(latest.naclPercent).toBe(24.58);
  });

  it('compares the plan with the latest sample', async () => {
    const { json } = await call('PUT', `/reports/${reportId}/samples`, {
      samples: [
        sample1,
        { ...sample1, mudWeight: toSI(131, 'pcf'), r600: 90, r300: 50, apiFluidLoss: 3 },
      ],
    });
    const { plan, latest } = json.data;
    expect(latest.seq).toBe(2);
    expect(fromSI(plan.actual.mudWeight, 'pcf')).toBeCloseTo(131, 9);
    expect(fromSI(plan.actual.yieldPoint, 'lbf_100ft2')).toBeCloseTo(10, 9);
    expect(plan.actual.fluidLoss).toBe(3);
    expect(plan.planned.fluidLoss).toBe(4);
  });

  it('rejects a bad time, an unknown source and more than six samples', async () => {
    const badTime = await call('PUT', `/reports/${reportId}/samples`, {
      samples: [{ sampleTime: '25:00' }],
    });
    expect(badTime.status).toBe(422);
    const unknown = await call('PUT', `/reports/${reportId}/samples`, {
      samples: [{ sampleSourceId: crypto.randomUUID() }],
    });
    expect(unknown.json.error.details[0].path).toBe('body.samples.0.sampleSourceId');
    const many = await call('PUT', `/reports/${reportId}/samples`, {
      samples: Array.from({ length: 7 }, () => ({})),
    });
    expect(many.status).toBe(422);
  });

  it('answers 404 for an unknown report', async () => {
    expect((await call('GET', `/reports/${crypto.randomUUID()}/samples`)).status).toBe(404);
  });
});
