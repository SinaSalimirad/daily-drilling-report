import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { fromSI, toSI } from '@ddr/calc/units';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// Mud-volume block and volume accounting (docs/09 scenario 4), with the numbers of
// DMR-SAVA-010: hole 518, string 50.3, annulus 137, below bit 331, TCV 454, end 1256 in the
// workbook; since v0.8.5 the values are exact (no intermediate rounding), so they agree with
// the workbook to the precision it displayed.

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
const bblOf = (m3: number) => Math.round(fromSI(m3, 'bbl') * 1e6) / 1e6;
const bbl = (value: number) => toSI(value, 'bbl');

describe('/api/v1 volumes', () => {
  let wellId: string;
  let projectId: string;
  let sectionId: string;
  let day9: string;
  let day10: string;
  let active: string;
  let reserve: string;
  let pump: string;

  beforeAll(async () => {
    projectId = (await call('POST', '/projects', { name: 'SAVA', operator: 'POGC', currency: '$' }))
      .json.data.id;
    wellId = (
      await call('POST', `/projects/${projectId}/wells`, {
        name: 'PYW-24ST1',
        wellType: 'directional',
        rigType: 'onshore',
      })
    ).json.data.id;
    sectionId = (
      await call('POST', `/wells/${wellId}/sections`, { holeSize: m(8.375), fluidType: 'wbm' })
    ).json.data.id;
    await call('POST', `/wells/${wellId}/hole-sections`, {
      type: 'casing',
      top: 0,
      bottom: 2283,
      outerDiameter: m(9.625),
      innerDiameter: m(8.625),
    });
    await call('POST', `/wells/${wellId}/hole-sections`, {
      type: 'open_hole',
      top: 0,
      bottom: 2263,
      innerDiameter: m(8.375),
    });
    const run = (
      await call('POST', `/wells/${wellId}/bha-runs`, {
        bitSize: m(8.375),
        nozzles: [],
        components: [
          {
            name: 'Drill pipe',
            length: null,
            outerDiameter: m(5),
            innerDiameter: m(4.2698412698412698),
          },
        ],
      })
    ).json.data.id;
    active = (
      await call('POST', `/projects/${projectId}/pits`, { name: 'Active', capacity: bbl(480) })
    ).json.data.id;
    reserve = (
      await call('POST', `/projects/${projectId}/pits`, { name: 'Reserve', capacity: bbl(480) })
    ).json.data.id;
    pump = (
      await call('POST', `/projects/${projectId}/pumps`, {
        model: 'FH 1500',
        type: 'triplex',
        linerDiameter: m(6),
        strokeLength: m(12),
        efficiency: 95,
      })
    ).json.data.id;

    day9 = (await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: '2026-08-05' }))
      .json.data.id;
    day10 = (await call('POST', `/wells/${wellId}/reports`, { sectionId })).json.data.id;

    const head = (id: string) => call('GET', `/reports/${id}`).then((r) => r.json.data);
    const d9 = await head(day9);
    await call('PATCH', `/reports/${day9}`, { revision: d9.revision, td: 2283 });
    const d10 = await head(day10);
    await call('PATCH', `/reports/${day10}`, {
      revision: d10.revision,
      td: 2263,
      bitDepth: 866,
      bhaRunId: run,
    });
    // Day 9 ends with 1193 bbl in the books; day 10 adds water, chemicals and losses.
    await call('PUT', `/reports/${day9}/volumes`, { entries: { received: bbl(1193) } });
    // 18.5 bbl of chemicals: a 1000 L package used 2.942 times = 2.942 m³ = 18.5 bbl.
    const product = (
      await call('POST', '/products', { name: 'Brine', packageSize: 1000, packageUnit: 'l' })
    ).json.data.id;
    const price = (
      await call('POST', `/projects/${projectId}/products`, {
        productId: product,
        origin: 'local',
        unitPrice: 1,
      })
    ).json.data.id;
    await call('PUT', `/reports/${day10}/inventory`, {
      moves: [{ projectProductId: price, received: 0, used: 2.942 }],
    });
    await call('PUT', `/reports/${day10}/volumes`, {
      entries: {
        water: bbl(100),
        shakers: bbl(7),
        evaporation: bbl(6),
        trip_loss: bbl(21),
        other: bbl(17),
        left_in_hole: bbl(4.47),
      },
    });
    await call('PUT', `/reports/${day10}/pit-readings`, {
      readings: [
        { pitId: active, pitType: 'active', volume: bbl(267) },
        { pitId: reserve, pitType: 'reserve', volume: bbl(471) },
      ],
    });
  });

  it('gives the mud-volume block (day 10: workbook 518, 50.3, 137, 331, 267, 471, 454)', async () => {
    const { status, json } = await call('GET', `/reports/${day10}/volumes`);
    expect(status).toBe(200);
    const block = json.data.block;
    expect(bblOf(block.hole)).toBeCloseTo(518.124, 2);
    expect(bblOf(block.string)).toBeCloseTo(50.319, 2);
    expect(bblOf(block.annulus)).toBeCloseTo(136.319, 2);
    expect(bblOf(block.belowBit)).toBeCloseTo(331.486, 2);
    expect(bblOf(block.active)).toBeCloseTo(267, 6);
    expect(bblOf(block.reserve)).toBeCloseTo(471, 6);
    expect(bblOf(block.totalCirculating)).toBeCloseTo(453.638, 2);
    expect(block.flowRate).toBeNull();
  });

  it('starts at the previous end volume and balances within half a barrel (end 1256)', async () => {
    const { json } = await call('GET', `/reports/${day10}/volumes`);
    const daily = json.data.accounting.daily;
    expect(bblOf(daily.start)).toBeCloseTo(1193, 6);
    expect(bblOf(daily.chemical)).toBeCloseTo(18.504, 2);
    expect(bblOf(daily.built)).toBeCloseTo(118.504, 2);
    expect(bblOf(daily.totalLosses)).toBeCloseTo(55.47, 6);
    expect(bblOf(daily.end)).toBeCloseTo(1256.034, 2);
    expect(Math.abs(bblOf(json.data.balance))).toBeLessThan(0.5);
    expect(json.warnings?.some((w: { code: string }) => w.code === 'VOLUME_NOT_BALANCED')).toBe(
      false,
    );
  });

  it('adds up the section and the well from the first report', async () => {
    const { json } = await call('GET', `/reports/${day10}/volumes`);
    const { section, well } = json.data.accounting;
    expect(bblOf(section.start)).toBeCloseTo(0, 9);
    expect(bblOf(well.received)).toBeCloseTo(1193, 6);
    expect(bblOf(well.water)).toBeCloseTo(100, 6);
    // The books of the period: 0 + 1193 − 0 + 118.504 − 1256.034 = 55.47 of losses.
    expect(bblOf(well.totalLosses)).toBeCloseTo(55.47, 2);
    const day9Result = await call('GET', `/reports/${day9}/volumes`);
    expect(bblOf(day9Result.json.data.accounting.daily.end)).toBeCloseTo(1193, 6);
  });

  it('warns when the books do not balance, without refusing the save', async () => {
    const { status, json } = await call('PUT', `/reports/${day10}/volumes`, {
      entries: { water: bbl(120), shakers: bbl(7) },
    });
    expect(status).toBe(200);
    const warning = json.warnings.find((w: { code: string }) => w.code === 'VOLUME_NOT_BALANCED');
    expect(warning).toBeDefined();
    expect(json.data.balance).not.toBe(0);
  });

  it('stores pump readings and computes the flow', async () => {
    const put = await call('PUT', `/reports/${day10}/pump-readings`, {
      readings: [{ pumpId: pump, spm: 100 }],
    });
    expect(put.status).toBe(200);
    expect(put.json.data.readings[0]).toMatchObject({ model: 'FH 1500', spm: 100 });
    const { json } = await call('GET', `/reports/${day10}/volumes`);
    // 4.19 gal/stroke × 100 SPM = 419 gpm (the pump output is exact now, not rounded to 4.19).
    expect(fromSI(json.data.block.flowRate, 'gpm')).toBeCloseTo(419, 0);
    expect(json.data.block.bottomsUpMinutes).toBeGreaterThan(0);
    expect(json.data.block.circulationMinutes).toBeGreaterThan(0);
  });

  it('rejects an unknown or repeated pump', async () => {
    const unknown = await call('PUT', `/reports/${day10}/pump-readings`, {
      readings: [{ pumpId: crypto.randomUUID(), spm: 1 }],
    });
    expect(unknown.status).toBe(422);
    const twice = await call('PUT', `/reports/${day10}/pump-readings`, {
      readings: [
        { pumpId: pump, spm: 1 },
        { pumpId: pump, spm: 2 },
      ],
    });
    expect(twice.json.error.details[0].path).toBe('body.readings.1.pumpId');
  });

  it('answers 404 for an unknown report', async () => {
    expect((await call('GET', `/reports/${crypto.randomUUID()}/volumes`)).status).toBe(404);
  });
});
