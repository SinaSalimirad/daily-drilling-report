import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { toSI } from '@ddr/calc/units';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// BHA runs: components, bit, nozzles, TFA, tool pressure rule, and the report link.

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
const run = {
  bitType: 'PDC',
  bitSize: m(8.375),
  manufacturer: 'Smith',
  nozzles: [{ size32: 12, quantity: 3 }],
  components: [
    { name: 'Drill pipe', length: null, outerDiameter: m(5), innerDiameter: m(4.27) },
    { name: '5" HWDP', length: 90, outerDiameter: m(5), innerDiameter: m(3) },
  ],
};

describe('/api/v1 BHA runs', () => {
  let wellId: string;
  let otherWell: string;
  let runId: string;
  let reportId: string;

  beforeAll(async () => {
    const projectId = (
      await call('POST', '/projects', { name: 'SAVA', operator: 'POGC', currency: '$' })
    ).json.data.id;
    const well = (name: string) =>
      call('POST', `/projects/${projectId}/wells`, {
        name,
        wellType: 'vertical',
        rigType: 'onshore',
      }).then((r) => r.json.data.id as string);
    wellId = await well('W1');
    otherWell = await well('W2');
    const sectionId = (
      await call('POST', `/wells/${wellId}/sections`, { holeSize: 0.2, fluidType: 'wbm' })
    ).json.data.id;
    reportId = (
      await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: '2026-08-06' })
    ).json.data.id;
  });

  it('creates a run with nozzles, components and the TFA of the nozzles', async () => {
    const { status, json } = await call('POST', `/wells/${wellId}/bha-runs`, run);
    expect(status).toBe(201);
    runId = json.data.id;
    expect(json.data).toMatchObject({ runNo: 1, bitType: 'PDC' });
    expect(json.data.components.map((c: { name: string }) => c.name)).toEqual([
      'Drill pipe',
      '5" HWDP',
    ]);
    expect(json.data.components[0].length).toBeNull();
    // 3 × 12/32 in nozzles: 0.3313 in² = 2.137e-4 m².
    expect(json.data.tfa / 0.0254 ** 2).toBeCloseTo(0.3313, 4);
    expect((await call('POST', `/wells/${wellId}/bha-runs`, run)).json.data.runNo).toBe(2);
  });

  it('a known TFA wins over the nozzles', async () => {
    const known = 0.5 * 0.0254 ** 2;
    const { json } = await call('PUT', `/bha-runs/${runId}`, { ...run, knownTfa: known });
    expect(json.data.tfa).toBeCloseTo(known, 12);
    expect(json.data.runNo).toBe(1);
  });

  it('replaces nozzles and components on PUT', async () => {
    const { json } = await call('PUT', `/bha-runs/${runId}`, {
      ...run,
      nozzles: [],
      components: [run.components[0]],
    });
    expect(json.data.nozzles).toEqual([]);
    expect(json.data.components).toHaveLength(1);
  });

  it('needs a length after the first component', async () => {
    const { status, json } = await call('POST', `/wells/${wellId}/bha-runs`, {
      ...run,
      components: [run.components[0], { ...run.components[1], length: null }],
    });
    expect(status).toBe(422);
    expect(json.error.details[0].path).toBe('body.components.1.length');
  });

  it('asks for the pressure loss of a motor (BHA_TOOL_PRESSURE_REQUIRED)', async () => {
    const motor = { name: 'Mud Motor', length: 8, outerDiameter: m(6.75), innerDiameter: m(3) };
    const refused = await call('POST', `/wells/${wellId}/bha-runs`, {
      ...run,
      components: [run.components[0], motor],
    });
    expect(refused.status).toBe(422);
    expect(refused.json.error.code).toBe('BHA_TOOL_PRESSURE_REQUIRED');
    const accepted = await call('POST', `/wells/${wellId}/bha-runs`, {
      ...run,
      toolPressureLoss: toSI(400, 'psi'),
      components: [run.components[0], motor],
    });
    expect(accepted.status).toBe(201);
  });

  it('is chosen by the report; a run of another well is refused; delete is IN_USE', async () => {
    const report = (await call('GET', `/reports/${reportId}`)).json.data;
    const chosen = await call('PATCH', `/reports/${reportId}`, {
      revision: report.revision,
      bhaRunId: runId,
    });
    expect(chosen.json.data.bhaRunId).toBe(runId);

    const foreign = (await call('POST', `/wells/${otherWell}/bha-runs`, run)).json.data.id;
    const wrong = await call('PATCH', `/reports/${reportId}`, {
      revision: chosen.json.data.revision,
      bhaRunId: foreign,
    });
    expect(wrong.status).toBe(422);
    expect(wrong.json.error.details[0].path).toBe('body.bhaRunId');

    const inUse = await call('DELETE', `/bha-runs/${runId}`);
    expect(inUse.status).toBe(409);
    expect(inUse.json.error.code).toBe('IN_USE');
    expect((await call('DELETE', `/bha-runs/${foreign}`)).status).toBe(204);
  });

  it('answers 404 for an unknown well or run', async () => {
    expect((await call('GET', `/wells/${crypto.randomUUID()}/bha-runs`)).status).toBe(404);
    expect((await call('GET', `/bha-runs/${crypto.randomUUID()}`)).status).toBe(404);
  });
});
