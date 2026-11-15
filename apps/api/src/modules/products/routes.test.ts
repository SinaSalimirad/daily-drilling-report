import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';

// Main path of the product catalogue and price list (docs/09), in a schema of its own.

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

const barite = { name: 'Barite', packageSize: 50, packageUnit: 'kg', specificGravity: 4.2 };

describe('/api/v1 products and price lists', () => {
  let sava: string;
  let other: string;
  let bariteId: string;
  let entryId: string;

  beforeAll(async () => {
    const project = { operator: 'POGC', currency: '$' };
    sava = (await call('POST', '/projects', { ...project, name: 'SAVA' })).json.data.id;
    other = (await call('POST', '/projects', { ...project, name: 'OTHER' })).json.data.id;
  });

  it('creates catalogue products and lists them sorted by name', async () => {
    const created = await call('POST', '/products', barite);
    expect(created.status).toBe(201);
    expect(created.json.data).toMatchObject(barite);
    bariteId = created.json.data.id;
    await call('POST', '/products', { name: 'Bentonite', packageSize: 25, packageUnit: 'kg' });
    await call('POST', '/products', { name: 'Caustic Soda', packageSize: 25, packageUnit: 'kg' });

    const { json } = await call('GET', '/products');
    expect(json.data.map((p: { name: string }) => p.name)).toEqual([
      'Barite',
      'Bentonite',
      'Caustic Soda',
    ]);
    expect(json.meta.total).toBe(3);
  });

  it('gives the same product a different price in two projects', async () => {
    const a = await call('POST', `/projects/${sava}/products`, {
      productId: bariteId,
      origin: 'foreign',
      unitPrice: 18.5,
    });
    expect(a.status).toBe(201);
    expect(a.json.data).toMatchObject({ origin: 'foreign', unitPrice: 18.5, active: true });
    expect(a.json.data.product.name).toBe('Barite');
    entryId = a.json.data.id;

    const b = await call('POST', `/projects/${other}/products`, {
      productId: bariteId,
      origin: 'local',
      unitPrice: 12,
    });
    expect(b.status).toBe(201);

    const savaList = await call('GET', `/projects/${sava}/products`);
    const otherList = await call('GET', `/projects/${other}/products`);
    expect(savaList.json.data[0].unitPrice).toBe(18.5);
    expect(otherList.json.data[0].unitPrice).toBe(12);
  });

  it('stores money with two decimals and returns a number', async () => {
    const { json } = await call('PATCH', `/project-products/${entryId}`, {
      unitPrice: 19.999,
      active: false,
    });
    expect(json.data.unitPrice).toBe(20);
    expect(typeof json.data.unitPrice).toBe('number');
    expect(json.data.active).toBe(false);
  });

  it('allows one price per product and project (409 CONFLICT)', async () => {
    const duplicate = await call('POST', `/projects/${sava}/products`, {
      productId: bariteId,
      origin: 'local',
      unitPrice: 1,
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.json.error.details.constraint).toBe(
      'project_products_project_id_product_id_unique',
    );
  });

  it('refuses to delete a product on a price list (409 IN_USE)', async () => {
    const { status, json } = await call('DELETE', `/products/${bariteId}`);
    expect(status).toBe(409);
    expect(json.error.code).toBe('IN_USE');
    expect((await call('GET', `/products/${bariteId}`)).status).toBe(200);
  });

  it('deletes a product once no price list holds it', async () => {
    const spare = (
      await call('POST', '/products', { name: 'Spare', packageSize: 1, packageUnit: 'bbl' })
    ).json.data.id;
    expect((await call('DELETE', `/products/${spare}`)).status).toBe(204);

    expect((await call('DELETE', `/project-products/${entryId}`)).status).toBe(204);
    expect((await call('GET', `/projects/${sava}/products`)).json.data).toEqual([]);
  });

  it('answers 404 and 422 where expected', async () => {
    const missing = crypto.randomUUID();
    const unknownProduct = await call('POST', `/projects/${sava}/products`, {
      productId: missing,
      origin: 'local',
      unitPrice: 1,
    });
    expect(unknownProduct.status).toBe(404);
    expect(unknownProduct.json.error.message).toBe('Product not found');

    const negative = await call('POST', '/products', { ...barite, name: 'X', packageSize: -1 });
    expect(negative.status).toBe(422);
    expect(negative.json.error.details[0].path).toBe('body.packageSize');

    const badUnit = await call('POST', '/products', { ...barite, name: 'Y', packageUnit: 'sack' });
    expect(badUnit.json.error.details[0].path).toBe('body.packageUnit');
  });
});
