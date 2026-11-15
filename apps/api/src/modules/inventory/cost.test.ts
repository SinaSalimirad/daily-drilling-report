import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Cost: daily, section, monthly and cumulative, with the local part (docs/09 scenario 3).
// Prices are invented test prices, not workbook values (KI-002).

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

describe('inventory cost and key stock', () => {
  let local: string; // price 10, local
  let foreign: string; // price 20, foreign
  const reports: string[] = [];

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
    const sectionA = (
      await call('POST', `/wells/${wellId}/sections`, { holeSize: 0.3, fluidType: 'wbm' })
    ).json.data.id;
    const sectionB = (
      await call('POST', `/wells/${wellId}/sections`, { holeSize: 0.2, fluidType: 'wbm' })
    ).json.data.id;
    const add = async (name: string, unitPrice: number, origin: string) => {
      const product = (
        await call('POST', '/products', { name, packageSize: 25, packageUnit: 'kg' })
      ).json.data.id;
      const body = { productId: product, origin, unitPrice };
      return (await call('POST', `/projects/${projectId}/products`, body)).json.data.id as string;
    };
    local = await add('Local product', 10, 'local');
    foreign = await add('Foreign product', 20, 'foreign');

    const make = async (sectionId: string, reportDate: string) =>
      (await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate })).json.data
        .id as string;
    reports.push(await make(sectionA, '2026-07-30'));
    reports.push(await make(sectionA, '2026-07-31'));
    reports.push(await make(sectionB, '2026-08-01'));
    const put = (index: number, moves: unknown[]) =>
      call('PUT', `/reports/${reports[index]}/inventory`, { moves });
    await put(0, [
      { projectProductId: local, received: 10, used: 2 },
      { projectProductId: foreign, received: 10, used: 0 },
    ]);
    await put(1, [
      { projectProductId: local, received: 0, used: 1 },
      { projectProductId: foreign, received: 0, used: 1 },
    ]);
    await call('PATCH', `/project-products/${local}`, { unitPrice: 100 });
    await put(2, [
      { projectProductId: local, received: 0, used: 1 },
      { projectProductId: foreign, received: 0, used: 2 },
    ]);
  });

  it('totals the day, the section, the month and everything', async () => {
    const second = (await call('GET', `/reports/${reports[1]}/inventory`)).json.data;
    expect(second.costs).toEqual({
      daily: { total: 30, local: 10 },
      section: { total: 50, local: 30 },
      monthly: { total: 50, local: 30 },
      cumulative: { total: 50, local: 30 },
    });
  });

  it('starts a new section and a new month, and keeps the old price on old moves', async () => {
    const third = (await call('GET', `/reports/${reports[2]}/inventory`)).json.data;
    expect(third.costs).toEqual({
      daily: { total: 140, local: 100 },
      section: { total: 140, local: 100 },
      monthly: { total: 140, local: 100 },
      cumulative: { total: 190, local: 130 },
    });
    const row = third.rows.find((r: { projectProductId: string }) => r.projectProductId === local);
    expect(row).toMatchObject({
      usedSection: 1,
      usedMonthly: 1,
      usedCumulative: 4,
      unitPrice: 100,
    });
    // The earlier report did not change when the price did.
    const first = (await call('GET', `/reports/${reports[0]}/inventory`)).json.data;
    expect(first.costs.daily).toEqual({ total: 20, local: 20 });
  });

  it('values the final stock at the current price', async () => {
    // local: 10 − 4 = 6 at 100; foreign: 10 − 3 = 7 at 20.
    const third = (await call('GET', `/reports/${reports[2]}/inventory`)).json.data;
    expect(third.stockValue).toBe(6 * 100 + 7 * 20);
  });

  it('marks key-stock products, at most five per project', async () => {
    expect((await call('PATCH', `/project-products/${foreign}`, { keyStock: true })).status).toBe(
      200,
    );
    const third = (await call('GET', `/reports/${reports[2]}/inventory`)).json.data;
    expect(
      third.rows
        .filter((r: { keyStock: boolean }) => r.keyStock)
        .map((r: { name: string }) => r.name),
    ).toEqual(['Foreign product']);

    // Five more products fill the limit (foreign + 4); the sixth is refused.
    const projectId = (await call('GET', `/reports/${reports[2]}`)).json.data.wellId;
    const well = (await call('GET', `/wells/${projectId}`)).json.data;
    const extra: string[] = [];
    for (const name of ['K1', 'K2', 'K3', 'K4', 'K5']) {
      const product = (await call('POST', '/products', { name, packageSize: 1, packageUnit: 'kg' }))
        .json.data.id;
      const body = { productId: product, origin: 'local', unitPrice: 1 };
      extra.push(
        (await call('POST', `/projects/${well.projectId}/products`, body)).json.data.id as string,
      );
    }
    for (const id of extra.slice(0, 4)) {
      expect((await call('PATCH', `/project-products/${id}`, { keyStock: true })).status).toBe(200);
    }
    const sixth = await call('PATCH', `/project-products/${extra[4]}`, { keyStock: true });
    expect(sixth.status).toBe(422);
    expect(sixth.json.error.details[0].path).toBe('body.keyStock');
  });
});
