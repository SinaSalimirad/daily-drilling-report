import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// docs/09 scenarios 5 and 6: submit writes the snapshot; an edit after submit rewrites it,
// raises the revision and marks the later reports stale until they are read again.

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

describe('/api/v1 report results', () => {
  let r1: string;
  let r2: string;
  let sectionId: string;

  const stale = async (id: string) =>
    (
      await testDb.db.execute<{ is_stale: boolean }>(
        sql`select is_stale from report_results where report_id = ${id}`,
      )
    ).rows[0]?.is_stale;
  const count = async () =>
    Number(
      (await testDb.db.execute<{ n: string }>(sql`select count(*) as n from report_results`))
        .rows[0]?.n,
    );

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
    sectionId = (
      await call('POST', `/wells/${wellId}/sections`, { holeSize: 0.2, fluidType: 'wbm' })
    ).json.data.id;
    r1 = (await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: '2026-08-01' }))
      .json.data.id;
    r2 = (await call('POST', `/wells/${wellId}/reports`, { sectionId })).json.data.id;
  });

  it('calculates a draft live, without storing anything', async () => {
    const { json } = await call('GET', `/reports/${r1}/results`);
    expect(json.data).toMatchObject({ source: 'live', isStale: false });
    expect(Object.keys(json.data.payload).sort()).toEqual([
      'hydraulics',
      'inventory',
      'samples',
      'volumes',
    ]);
    expect(await count()).toBe(0);
  });

  it('writes the snapshot when the report is submitted, with the engine version', async () => {
    const report = (await call('GET', `/reports/${r1}`)).json.data;
    const submitted = await call('POST', `/reports/${r1}/submit`, {
      revision: report.revision,
      acknowledgeWarnings: true,
    });
    expect(submitted.status).toBe(200);
    expect(await count()).toBe(1);
    const { json } = await call('GET', `/reports/${r1}/results`);
    expect(json.data).toMatchObject({ source: 'snapshot', engineVersion: '0.8.5', revision: 2 });
  });

  it('rewrites the snapshot after an edit, raises the revision and marks later reports stale', async () => {
    const second = (await call('GET', `/reports/${r2}`)).json.data;
    await call('POST', `/reports/${r2}/submit`, {
      revision: second.revision,
      acknowledgeWarnings: true,
    });
    expect(await stale(r2)).toBe(false);

    const first = (await call('GET', `/reports/${r1}`)).json.data;
    const patched = await call('PATCH', `/reports/${r1}`, {
      revision: first.revision,
      formation: 'Asmari',
    });
    expect(patched.json.data.revision).toBe(first.revision + 1);
    const { json } = await call('GET', `/reports/${r1}/results`);
    expect(json.data.revision).toBe(first.revision + 1);
    expect(await stale(r2)).toBe(true);

    // The first read recalculates the later report and clears the flag.
    const again = await call('GET', `/reports/${r2}/results`);
    expect(again.json.data).toMatchObject({ source: 'snapshot', isStale: false });
    expect(await stale(r2)).toBe(false);
  });

  it('refreshes the snapshot after any other write to a submitted report', async () => {
    await call('PUT', `/reports/${r1}/volumes`, { entries: { received: 100 } });
    const { json } = await call('GET', `/reports/${r1}/results`);
    expect(json.data.payload.volumes.entries.received).toBe(100);
    expect(await stale(r2)).toBe(true);
  });

  it('refuses a wrong revision with REVISION_MISMATCH and keeps the snapshot', async () => {
    const { status, json } = await call('PATCH', `/reports/${r1}`, { revision: 1, formation: 'X' });
    expect(status).toBe(409);
    expect(json.error.code).toBe('REVISION_MISMATCH');
  });

  it('answers 404 for an unknown report', async () => {
    expect((await call('GET', `/reports/${crypto.randomUUID()}/results`)).status).toBe(404);
  });
});
