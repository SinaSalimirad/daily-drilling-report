import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Stock and price copy of the chemical inventory (docs/09 scenarios 2 and 3). The prices
// are invented test prices, not workbook values (KI-002).

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

describe('/api/v1 inventory', () => {
  let projectId: string;
  let wellId: string;
  let barite: string; // project product ids
  let gel: string;
  let report1: string;
  let report2: string;

  const row = (json: Json, id: string) =>
    json.data.rows.find((r: { projectProductId: string }) => r.projectProductId === id);

  beforeAll(async () => {
    projectId = (await call('POST', '/projects', { name: 'SAVA', operator: 'POGC', currency: '$' }))
      .json.data.id;
    wellId = (
      await call('POST', `/projects/${projectId}/wells`, {
        name: 'PYW-24ST1',
        wellType: 'vertical',
        rigType: 'onshore',
        spudDate: '2026-07-28',
      })
    ).json.data.id;
    const sectionId = (
      await call('POST', `/wells/${wellId}/sections`, { holeSize: 0.3, fluidType: 'wbm' })
    ).json.data.id;
    const addProduct = async (name: string, unitPrice: number, origin: string) => {
      const product = (
        await call('POST', '/products', {
          name,
          packageSize: 25,
          packageUnit: 'kg',
          specificGravity: 2.6,
        })
      ).json.data.id;
      return (
        await call('POST', `/projects/${projectId}/products`, {
          productId: product,
          origin,
          unitPrice,
        })
      ).json.data.id as string;
    };
    barite = await addProduct('Barite', 10, 'local');
    gel = await addProduct('Gel', 20, 'foreign');
    report1 = (await call('POST', `/wells/${wellId}/reports`, { sectionId })).json.data.id;
    report2 = (await call('POST', `/wells/${wellId}/reports`, { sectionId })).json.data.id;
  });

  it('lists every active product with zero stock before any move', async () => {
    const { status, json } = await call('GET', `/reports/${report1}/inventory`);
    expect(status).toBe(200);
    expect(json.data.rows.map((r: { name: string }) => r.name)).toEqual(['Barite', 'Gel']);
    expect(row(json, barite)).toMatchObject({ initial: 0, finalStock: 0, dailyCost: 0 });
  });

  it('takes opening stock as received on report 1 (workbook: received 164 → stock 164)', async () => {
    const { json } = await call('PUT', `/reports/${report1}/inventory`, {
      moves: [
        { projectProductId: barite, received: 164, used: 0 },
        { projectProductId: gel, received: 50, used: 12 },
      ],
    });
    expect(row(json, barite)).toMatchObject({ initial: 0, received: 164, finalStock: 164 });
    expect(row(json, gel)).toMatchObject({
      received: 50,
      used: 12,
      finalStock: 38,
      dailyCost: 240,
    });
  });

  it('carries the stock of earlier reports into the next day', async () => {
    const { json } = await call('PUT', `/reports/${report2}/inventory`, {
      moves: [
        { projectProductId: barite, received: 0, used: 10.5 },
        { projectProductId: gel, received: -8, used: 0 },
      ],
    });
    expect(row(json, barite)).toMatchObject({
      initial: 164,
      used: 10.5,
      finalStock: 153.5,
      dailyCost: 105,
    });
    expect(row(json, gel)).toMatchObject({ initial: 38, received: -8, finalStock: 30 });
    // The first day is not changed by the second.
    const first = await call('GET', `/reports/${report1}/inventory`);
    expect(row(first.json, barite).finalStock).toBe(164);
  });

  it('copies the price onto a move; a later price change does not alter earlier reports', async () => {
    await call('PATCH', `/project-products/${barite}`, { unitPrice: 99 });
    const old = await call('GET', `/reports/${report2}/inventory`);
    expect(row(old.json, barite)).toMatchObject({ unitPrice: 10, dailyCost: 105 });
    // A report without a move shows the current price; a changed move keeps its copy.
    const kept = await call('PUT', `/reports/${report2}/inventory`, {
      moves: [{ projectProductId: barite, received: 0, used: 20 }],
    });
    expect(row(kept.json, barite)).toMatchObject({ unitPrice: 10, dailyCost: 200 });
    // A product first used after the change takes the new price.
    const fresh = await call('PUT', `/reports/${report1}/inventory`, {
      moves: [
        { projectProductId: barite, received: 164, used: 0 },
        { projectProductId: gel, received: 50, used: 12 },
      ],
    });
    expect(row(fresh.json, barite).unitPrice).toBe(10);
  });

  it('drops a move with received 0 and used 0', async () => {
    const { json } = await call('PUT', `/reports/${report2}/inventory`, {
      moves: [{ projectProductId: gel, received: 0, used: 0 }],
    });
    expect(row(json, gel)).toMatchObject({ received: 0, used: 0, initial: 38, finalStock: 38 });
  });

  it('rejects an unknown or repeated product and a negative usage', async () => {
    const unknown = await call('PUT', `/reports/${report2}/inventory`, {
      moves: [{ projectProductId: crypto.randomUUID(), received: 1, used: 0 }],
    });
    expect(unknown.status).toBe(422);
    expect(unknown.json.error.details[0].path).toBe('body.moves.0.projectProductId');
    const twice = await call('PUT', `/reports/${report2}/inventory`, {
      moves: [
        { projectProductId: gel, received: 1, used: 0 },
        { projectProductId: gel, received: 1, used: 0 },
      ],
    });
    expect(twice.json.error.details[0].path).toBe('body.moves.1.projectProductId');
    const negative = await call('PUT', `/reports/${report2}/inventory`, {
      moves: [{ projectProductId: gel, received: 0, used: -1 }],
    });
    expect(negative.status).toBe(422);
  });

  it('warns about a negative final stock, without refusing the save (docs/09 scenario 2)', async () => {
    const { status, json } = await call('PUT', `/reports/${report2}/inventory`, {
      moves: [{ projectProductId: gel, received: 0, used: 100 }],
    });
    expect(status).toBe(200);
    expect(row(json, gel).finalStock).toBe(-62);
    const negative = json.warnings.find((w: { code: string }) => w.code === 'NEGATIVE_STOCK');
    expect(negative.details.products).toEqual([
      expect.objectContaining({ name: 'Gel', finalStock: -62 }),
    ]);
    // It is open at submit until acknowledged.
    const report = (await call('GET', `/reports/${report2}`)).json.data;
    const refused = await call('POST', `/reports/${report2}/submit`, { revision: report.revision });
    expect(refused.json.error.code).toBe('WARNINGS_NOT_ACKNOWLEDGED');
    expect(refused.json.error.details.warnings.map((w: { code: string }) => w.code)).toContain(
      'NEGATIVE_STOCK',
    );
    // Back to a valid stock: the warning is gone.
    const fixed = await call('PUT', `/reports/${report2}/inventory`, { moves: [] });
    expect(fixed.json.warnings?.some((w: { code: string }) => w.code === 'NEGATIVE_STOCK')).toBe(
      false,
    );
  });

  it('answers 404 for an unknown report', async () => {
    expect((await call('GET', `/reports/${crypto.randomUUID()}/inventory`)).status).toBe(404);
  });
});
