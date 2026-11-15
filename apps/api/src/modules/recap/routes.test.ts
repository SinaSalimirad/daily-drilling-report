import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { toSI } from '@ddr/calc/units';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Recap by section and by well. Prices are invented test prices (KI-002).

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

describe('/api/v1 recap', () => {
  let wellId: string;
  let sectionA: string;
  let sectionB: string;

  beforeAll(async () => {
    const projectId = (
      await call('POST', '/projects', { name: 'SAVA', operator: 'POGC', currency: '$' })
    ).json.data.id;
    wellId = (
      await call('POST', `/projects/${projectId}/wells`, {
        name: 'W1',
        wellType: 'vertical',
        rigType: 'onshore',
      })
    ).json.data.id;
    const section = async (size: number) =>
      (await call('POST', `/wells/${wellId}/sections`, { holeSize: size, fluidType: 'wbm' })).json
        .data.id as string;
    sectionA = await section(0.3);
    sectionB = await section(0.2);
    const product = async (
      name: string,
      unit: string,
      price: number,
      origin: string,
      sg?: number,
    ) => {
      const id = (
        await call('POST', '/products', {
          name,
          packageSize: 25,
          packageUnit: unit,
          specificGravity: sg,
        })
      ).json.data.id;
      return (
        await call('POST', `/projects/${projectId}/products`, {
          productId: id,
          origin,
          unitPrice: price,
        })
      ).json.data.id as string;
    };
    const barite = await product('Barite', 'kg', 10, 'local', 4.2);
    const polymer = await product('Polymer', 'l', 20, 'foreign');
    const activity = (
      await testDb.db.execute<{ id: string }>(
        sql`insert into activities (name, sort_order) values ('Drilling', 1) returning id`,
      )
    ).rows[0]?.id as string;

    const day = async (sectionId: string, date: string, moves: unknown[], rop: number) => {
      const id = (await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: date }))
        .json.data.id as string;
      const report = (await call('GET', `/reports/${id}`)).json.data;
      await call('PATCH', `/reports/${id}`, { revision: report.revision, rop: toSI(rop, 'ft_h') });
      await call('PUT', `/reports/${id}/inventory`, { moves });
      await call('PUT', `/reports/${id}/activities`, {
        activities: [{ activityId: activity, hours: 24 }],
      });
      await call('PUT', `/reports/${id}/volumes`, { entries: { water: toSI(100, 'bbl') } });
    };
    await day(sectionA, '2026-08-01', [{ projectProductId: barite, received: 100, used: 10 }], 30);
    await day(sectionA, '2026-08-02', [{ projectProductId: barite, received: 0, used: 20 }], 50);
    await day(sectionB, '2026-08-03', [{ projectProductId: polymer, received: 10, used: 4 }], 20);
  });

  it('recaps the latest section by default: its cost, products, hours and ROP', async () => {
    const { status, json } = await call('GET', `/wells/${wellId}/recap`);
    expect(status).toBe(200);
    const recap = json.data;
    expect(recap).toMatchObject({ scope: 'section', sectionId: sectionB });
    expect(recap.reports).toEqual({ count: 1, first: 3, last: 3 });
    expect(recap.cost).toEqual({ total: 80, local: 0 });
    expect(recap.products).toHaveLength(1);
    expect(recap.products[0]).toMatchObject({
      name: 'Polymer',
      used: 4,
      unitPrice: 20,
      cost: 80,
      costShare: 100,
      concentration: null,
    });
    expect(recap.products[0].volumePercent).toBeGreaterThan(0);
    expect(recap.operationHours).toEqual([{ activity: 'Drilling', hours: 24 }]);
    expect(recap.averageRop).toBeCloseTo(toSI(20, 'ft_h'), 12);
  });

  it('recaps a chosen section: cost, mass concentration and shares', async () => {
    const { json } = await call(
      'GET',
      `/wells/${wellId}/recap?scope=section&sectionId=${sectionA}`,
    );
    const recap = json.data;
    expect(recap.reports.count).toBe(2);
    expect(recap.cost).toEqual({ total: 300, local: 300 });
    expect(recap.products[0]).toMatchObject({
      name: 'Barite',
      used: 30,
      cost: 300,
      costShare: 100,
    });
    // 30 packages of 25 kg = 750 kg in the mud built over the section: 200 bbl of water plus
    // the chemicals (0.4 + 0.7 bbl, each day rounded to one decimal as the workbook does).
    expect(recap.products[0].concentration).toBeCloseTo(750 / toSI(201.1, 'bbl'), 6);
    expect(recap.operationHours[0].hours).toBe(48);
    expect(recap.averageRop).toBeCloseTo(toSI(40, 'ft_h'), 12);
  });

  it('recaps the whole well, with the accounting column of the well', async () => {
    const { json } = await call('GET', `/wells/${wellId}/recap?scope=well`);
    const recap = json.data;
    expect(recap.sectionId).toBeNull();
    expect(recap.reports).toEqual({ count: 3, first: 1, last: 3 });
    expect(recap.cost.total).toBe(380);
    expect(recap.cost.local).toBe(300);
    expect(recap.products.map((p: { name: string }) => p.name)).toEqual(['Barite', 'Polymer']);
    expect(recap.products[0].costShare).toBeCloseTo(78.95, 2);
    expect(recap.accounting.water).toBeCloseTo(toSI(300, 'bbl'), 6);
  });

  it('answers 404 for an unknown well, and for a well without reports', async () => {
    expect((await call('GET', `/wells/${crypto.randomUUID()}/recap`)).status).toBe(404);
    const projectId = (
      await call('POST', '/projects', { name: 'P2', operator: 'X', currency: '$' })
    ).json.data.id;
    const empty = (
      await call('POST', `/projects/${projectId}/wells`, {
        name: 'W2',
        wellType: 'vertical',
        rigType: 'onshore',
      })
    ).json.data.id;
    expect((await call('GET', `/wells/${empty}/recap`)).status).toBe(404);
  });
});
