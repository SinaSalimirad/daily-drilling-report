import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApp } from '../../app';
import type { SessionUser } from '../../auth/session';
import { user } from '../../db/schema';
import { createTestDb, type TestDb } from '../../test/db';
import { admin } from '../../test/session';

// Consumption dashboard (#216, #220): daily rows of packages used, received and returned in the
// visible wells. The sums by month and by section equal the inventory's own monthly and section
// usage; the well scope and the client's "submitted only" apply.

let testDb: TestDb;
let app: ReturnType<typeof createApp>;

const engineer: SessionUser = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Eng',
  email: 'eng@example.test',
  role: 'engineer',
};
const client: SessionUser = {
  id: '00000000-0000-4000-8000-000000000003',
  name: 'Client',
  email: 'client@example.test',
  role: 'client',
};
const users: Record<string, SessionUser> = { admin, engineer, client };

beforeAll(async () => {
  testDb = await createTestDb();
  await testDb.db
    .insert(user)
    .values(
      [engineer, client].map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    );
  app = createApp({
    session: async (request) => users[request.headers.get('x-test-user') ?? 'admin'] ?? null,
    log: { production: true, level: 'error', write: () => {} },
    db: testDb.db,
  });
});
afterAll(() => testDb.drop());

// biome-ignore lint/suspicious/noExplicitAny: tests read untyped JSON bodies
type Json = any;

async function call(method: string, path: string, body?: unknown, as = 'admin'): Promise<Json> {
  const res = await app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: {
        'x-test-user': as,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const text = await res.text();
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : undefined;
}

type Row = {
  reportDate: string;
  sectionId: string;
  used: number;
  received: number;
  returned: number;
};
const sum = (rows: Row[], key: 'used' | 'received' | 'returned') =>
  rows.reduce((total, row) => total + row[key], 0);

describe('GET /dashboard/consumption', () => {
  let wellA: string;
  let wellB: string;
  let lastReport: string;
  let section2: string;

  beforeAll(async () => {
    const project = (await call('POST', '/projects', { name: 'P', operator: 'O', currency: '$' }))
      .data.id;
    const product = (
      await call('POST', '/products', { name: 'Barite', packageSize: 25, packageUnit: 'kg' })
    ).data.id;
    const price = (
      await call('POST', `/projects/${project}/products`, {
        productId: product,
        origin: 'local',
        unitPrice: 10,
      })
    ).data.id;
    const well = async (name: string) =>
      (
        await call('POST', `/projects/${project}/wells`, {
          name,
          wellType: 'vertical',
          rigType: 'onshore',
        })
      ).data.id;
    wellA = await well('A');
    wellB = await well('B');
    const section = async (wellId: string, holeSize: number) =>
      (await call('POST', `/wells/${wellId}/sections`, { holeSize, fluidType: 'wbm' })).data.id;
    const section1 = await section(wellA, 0.3);
    section2 = await section(wellA, 0.2);
    const sectionB = await section(wellB, 0.3);

    const day = async (
      wellId: string,
      sectionId: string,
      reportDate: string,
      used: number,
      received: number,
    ) => {
      const report = (await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate }))
        .data;
      await call('PUT', `/reports/${report.id}/inventory`, {
        moves: [{ projectProductId: price, received, used }],
      });
      return report;
    };
    const first = await day(wellA, section1, '2026-07-30', 4, 100);
    await day(wellA, section1, '2026-07-31', 3, 0);
    // A return of 5 packages is a negative "received".
    await day(wellA, section2, '2026-08-01', 2, -5);
    lastReport = (await day(wellA, section2, '2026-08-02', 0, 10)).id;
    await day(wellB, sectionB, '2026-07-30', 7, 100);
    await call('POST', `/reports/${first.id}/submit`, {
      revision: first.revision,
      acknowledgeWarnings: true,
    });
    await call('PUT', `/wells/${wellA}/members`, { userIds: [engineer.id, client.id] });
  });

  it('gives the daily moves of every well, which sum to the inventory usage', async () => {
    const { data } = await call('GET', '/dashboard/consumption');
    expect(data.projects).toEqual([expect.objectContaining({ name: 'P' })]);
    expect(data.wells.map((w: { name: string }) => w.name)).toEqual(['A', 'B']);
    expect(data.products).toEqual([
      expect.objectContaining({ name: 'Barite', packageSize: 25, packageUnit: 'kg' }),
    ]);
    const a: Row[] = data.usage.filter((row: { wellId: string }) => row.wellId === wellA);
    expect(a.map((row) => [row.reportDate, row.used, row.received, row.returned])).toEqual([
      ['2026-07-30', 4, 100, 0],
      ['2026-07-31', 3, 0, 0],
      ['2026-08-01', 2, 0, 5],
      ['2026-08-02', 0, 10, 0],
    ]);
    expect(data.usage[0]).not.toHaveProperty('cost');

    // August and section 2 of well A, against the inventory of the last report.
    const [row] = (await call('GET', `/reports/${lastReport}/inventory`)).data.rows;
    const august = a.filter((r) => r.reportDate.startsWith('2026-08'));
    const inSection2 = a.filter((r) => r.sectionId === section2);
    expect(sum(august, 'used')).toBe(row.usedMonthly);
    expect(sum(inSection2, 'used')).toBe(row.usedSection);
    expect(sum(a, 'used')).toBe(row.usedCumulative);
    // Received − returned − used is the stock.
    expect(sum(a, 'received') - sum(a, 'returned') - sum(a, 'used')).toBe(row.finalStock);
    expect(data.sections.filter((s: { wellId: string }) => s.wellId === wellA)).toHaveLength(2);
  });

  it('shows an engineer only the assigned wells, and a client only submitted reports', async () => {
    const forEngineer = (await call('GET', '/dashboard/consumption', undefined, 'engineer')).data;
    expect(forEngineer.wells.map((w: { id: string }) => w.id)).toEqual([wellA]);
    expect(forEngineer.usage).toHaveLength(4);
    expect(forEngineer.sections.every((s: { wellId: string }) => s.wellId === wellA)).toBe(true);

    const forClient = (await call('GET', '/dashboard/consumption', undefined, 'client')).data;
    expect(forClient.wells.map((w: { id: string }) => w.id)).toEqual([wellA]);
    expect(forClient.usage.map((row: { reportDate: string }) => row.reportDate)).toEqual([
      '2026-07-30',
    ]);
  });

  it('is empty for a user without wells', async () => {
    await call('PUT', `/wells/${wellA}/members`, { userIds: [] });
    const { data } = await call('GET', '/dashboard/consumption', undefined, 'engineer');
    expect(data).toEqual({ projects: [], wells: [], sections: [], products: [], usage: [] });
  });
});
