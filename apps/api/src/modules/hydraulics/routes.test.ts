import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { fromSI, toSI } from '@ddr/calc/units';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Survey stations and the hydraulics / hole-cleaning results of a report. The numbers are
// checked for consistency (totals, scaling, ordering); see KI-007 for the workbook check.

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

const m = (inches: number) => toSI(inches, 'in');

describe('/api/v1 survey and hydraulics', () => {
  let wellId: string;
  let reportId: string;

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
    const sectionId = (
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
      bottom: 2600,
      innerDiameter: m(8.375),
    });
    reportId = (
      await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: '2026-08-08' })
    ).json.data.id;
    const pump = (
      await call('POST', `/projects/${projectId}/pumps`, {
        model: 'FH 1500',
        type: 'triplex',
        linerDiameter: m(6),
        strokeLength: m(12),
        efficiency: 95,
      })
    ).json.data.id;
    const run = (
      await call('POST', `/wells/${wellId}/bha-runs`, {
        bitType: 'PDC',
        bitSize: m(8.375),
        nozzles: [{ size32: 12, quantity: 4 }],
        components: [
          { name: 'Drill pipe', length: null, outerDiameter: m(5), innerDiameter: m(4.27) },
          { name: 'HWDP', length: 120, outerDiameter: m(5), innerDiameter: m(3) },
          { name: 'Drill collar', length: 90, outerDiameter: m(6.5), innerDiameter: m(2.8125) },
        ],
      })
    ).json.data.id;
    const report = (await call('GET', `/reports/${reportId}`)).json.data;
    await call('PATCH', `/reports/${reportId}`, {
      revision: report.revision,
      bitDepth: 2290,
      td: 2290,
      tvd: 2250,
      spp: toSI(2750, 'psi'),
      rop: toSI(60, 'ft_h'),
      particleDiameter: m(0.25),
      particleThickness: m(0.1),
      bhaRunId: run,
    });
    await call('PUT', `/reports/${reportId}/pump-readings`, {
      readings: [{ pumpId: pump, spm: 100 }],
    });
    await call('PUT', `/reports/${reportId}/samples`, {
      samples: [{ mudWeight: toSI(130, 'pcf'), r600: 84, r300: 48, r100: 36, r3: 3 }],
    });
  });

  it('keeps the survey in depth order and gives TVD (the Incl method)', async () => {
    const { status, json } = await call('PUT', `/wells/${wellId}/survey`, {
      stations: [
        { measuredDepth: 100, inclination: 0, azimuth: 0 },
        { measuredDepth: 200, inclination: 90, azimuth: 0 },
      ],
    });
    expect(status).toBe(200);
    const tvd = json.data.stations.map((s: { tvd: number }) => s.tvd);
    expect(tvd[0]).toBeCloseTo(100, 9);
    expect(tvd[1]).toBeCloseTo(161.980765, 6);
    const bad = await call('PUT', `/wells/${wellId}/survey`, {
      stations: [
        { measuredDepth: 100, inclination: 0, azimuth: 0 },
        { measuredDepth: 100, inclination: 5, azimuth: 0 },
      ],
    });
    expect(bad.status).toBe(422);
    expect(bad.json.error.code).toBe('SURVEY_DEPTH_NOT_INCREASING');
    expect((await call('GET', `/wells/${wellId}/survey`)).json.data.stations).toHaveLength(2);
  });

  it('warns when the survey ends above the TD of a directional well', async () => {
    const { json } = await call('GET', `/reports/${reportId}`);
    expect(json.warnings.some((w: { code: string }) => w.code === 'SURVEY_NOT_UPDATED')).toBe(true);
  });

  it('lists what is missing before it can calculate', async () => {
    const sectionId = (await call('GET', `/reports/${reportId}`)).json.data.sectionId;
    const bare = (await call('POST', `/wells/${wellId}/reports`, { sectionId })).json.data.id;
    const { json } = await call('GET', `/reports/${bare}/hydraulics`);
    expect(json.data.missing.length).toBeGreaterThan(0);
    expect(json.data.pipe).toEqual([]);
  });

  it('calculates pipe, annulus and bit losses, and the totals add up', async () => {
    const { status, json } = await call('GET', `/reports/${reportId}/hydraulics`);
    expect(status).toBe(200);
    const h = json.data;
    expect(h.missing).toEqual([]);
    expect(fromSI(h.flowRate, 'gpm')).toBeCloseTo(419, 0);
    expect(h.pipe.map((p: { name: string }) => p.name)).toEqual([
      'Drill pipe',
      'HWDP',
      'Drill collar',
    ]);
    const sum = (rows: { pressureLoss: number }[]) => rows.reduce((t, r) => t + r.pressureLoss, 0);
    expect(h.totals.pipe).toBeCloseTo(sum(h.pipe), 3);
    expect(h.totals.annulus).toBeCloseTo(sum(h.annulus), 3);
    expect(h.totals.total).toBeCloseTo(
      h.totals.pipe + h.totals.annulus + h.totals.bit + h.totals.tools,
      3,
    );
    expect(h.bit.pressureLoss).toBeGreaterThan(0);
    expect(h.systemHorsepower).toBeGreaterThan(0);
    // ECD is above the mud weight.
    expect(fromSI(h.ecd, 'pcf')).toBeGreaterThan(130);
    // The pipe is 2080 m long, so it and the HWDP stay in the casing (shoe at 2283 m);
    // the drill collar crosses the shoe and has a segment in the casing and one in the open hole.
    const names = h.annulus.map((a: { name: string }) => a.name);
    expect(names).toContain('Drill pipe in casing');
    expect(names).toContain('Drill collar in casing');
    expect(names).toContain('Drill collar in open hole');
    expect(names).not.toContain('Drill pipe in open hole');
  });

  it('scales the frictional losses to the measured pressure in actual mode', async () => {
    const virtual = (await call('GET', `/reports/${reportId}/hydraulics?mode=virtual`)).json.data;
    const actual = (await call('GET', `/reports/${reportId}/hydraulics?mode=actual`)).json.data;
    expect(virtual.scale).toBe(1);
    expect(actual.mode).toBe('actual');
    expect(actual.totals.total).toBeCloseTo(toSI(2750, 'psi'), 0);
  });

  it('judges the hole cleaning of each annular segment', async () => {
    const { json } = await call('GET', `/reports/${reportId}/hydraulics`);
    const cleaned = json.data.annulus.filter((a: { cleaning: unknown }) => a.cleaning);
    expect(cleaned.length).toBeGreaterThan(0);
    for (const a of cleaned) {
      expect(['V-Good', 'Good', 'OK', 'Poor', 'V-Poor']).toContain(a.cleaning.verdict);
    }
  });

  it('answers 404 for an unknown report or well', async () => {
    expect((await call('GET', `/reports/${crypto.randomUUID()}/hydraulics`)).status).toBe(404);
    expect((await call('GET', `/wells/${crypto.randomUUID()}/survey`)).status).toBe(404);
  });
});
