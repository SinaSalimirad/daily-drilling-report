import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { fromSI, UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import { count, eq } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { pits, products, projectProducts, projects, pumps, sceUnits, wells } from '../schema';
import { demoProjectId, seedDemo } from './demo';
import { DEMO_PRODUCTS } from './demo-data';

// A fresh database plus the demo seed holds the workbook's master data (issue V020-14),
// read back through the API as the web app does.

let testDb: TestDb;
beforeAll(async () => {
  testDb = await createTestDb();
});
afterAll(() => testDb.drop());

const rows = async (table: typeof projects | typeof products | typeof projectProducts) =>
  (await testDb.db.select({ n: count() }).from(table))[0]?.n;
const round2 = (x: number) => Math.round(x * 100) / 100;

describe('db:seed:demo', () => {
  it('is idempotent', async () => {
    await seedDemo(testDb.db);
    await seedDemo(testDb.db);
    const projectId = await demoProjectId(testDb.db);
    const per = async (table: typeof wells | typeof pits | typeof pumps | typeof sceUnits) =>
      (await testDb.db.select({ n: count() }).from(table).where(eq(table.projectId, projectId)))[0]
        ?.n;
    expect(await rows(projects)).toBe(1);
    expect(await per(wells)).toBe(1);
    expect(await per(pits)).toBe(8);
    expect(await per(pumps)).toBe(3);
    expect(await per(sceUnits)).toBe(3);
    expect(await rows(products)).toBe(DEMO_PRODUCTS.length);
    expect(await rows(projectProducts)).toBe(0);
  });

  it('serves the workbook master data through the API', async () => {
    const app = createApp({
      log: { production: true, level: 'error', write: () => {} },
      db: testDb.db,
    });
    // biome-ignore lint/suspicious/noExplicitAny: test reads untyped JSON bodies
    const get = async (path: string): Promise<any> =>
      (await app.handle(new Request(`http://localhost/api/v1${path}`))).json();
    const projectId = await demoProjectId(testDb.db);

    const project = (await get(`/projects/${projectId}`)).data;
    expect(project).toMatchObject({ name: 'SAVA', operator: 'KKC', currency: '€' });
    expect(project.unitSystem).toEqual(UNIT_SYSTEM_PRESETS.workbook);

    const well = (await get(`/projects/${projectId}/wells`)).data[0];
    expect(well).toMatchObject({
      name: 'PYW-24ST1',
      designation: 're_entry',
      spudDate: '2026-07-28',
    });

    const pitList = (await get(`/projects/${projectId}/pits`)).data;
    expect(pitList.map((p: { name: string }) => p.name)).toEqual([
      'Suction 1',
      'Suction 2',
      'Reserve 1',
      'Reserve 2',
      'Reserve 3',
      'Middle',
      'Desander',
      'Trip Tank',
    ]);
    expect(round2(fromSI(pitList[0].capacity, 'bbl'))).toBe(480);

    const pumpList = (await get(`/projects/${projectId}/pumps`)).data;
    expect(
      pumpList.map((p: { outputPerStroke: number }) => round2(fromSI(p.outputPerStroke, 'gal'))),
    ).toEqual([4.19, 4.19, 4.91]);

    const shakers = (await get(`/projects/${projectId}/sce-units`)).data;
    expect(
      shakers.map((u: { type: string; unitNumber: number }) => `${u.type} #${u.unitNumber}`),
    ).toEqual(['Shaker #1', 'Shaker #2', 'Shaker #3']);

    const catalogue = (await get('/products?pageSize=100')).data;
    expect(catalogue).toHaveLength(25);
    expect(catalogue.find((p: { name: string }) => p.name === 'Barite')).toMatchObject({
      packageSize: 1.5,
      packageUnit: 't',
      specificGravity: 4.2,
    });
  });
});
