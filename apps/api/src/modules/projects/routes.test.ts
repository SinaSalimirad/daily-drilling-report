import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// Main path of the projects module (docs/09: one integration test per module),
// in a schema of its own.

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
  return { status: res.status, json: await res.json() };
}

const sava = {
  name: 'SAVA PYW',
  operator: 'POGC',
  contractor: 'Sava Drilling',
  rigName: 'GPTK-G2',
  fieldCountry: 'Iran',
  currency: '$',
};

describe('/api/v1/projects', () => {
  let id: string;

  it('creates a project with the SI unit system by default', async () => {
    const { status, json } = await call('POST', '/projects', sava);
    expect(status).toBe(201);
    expect(json.data).toMatchObject({ ...sava, archivedAt: null });
    expect(json.data.unitSystem).toEqual(UNIT_SYSTEM_PRESETS.si);
    id = json.data.id;
  });

  it('reads it back', async () => {
    const { status, json } = await call('GET', `/projects/${id}`);
    expect(status).toBe(200);
    expect(json.data.name).toBe('SAVA PYW');
  });

  it('updates fields and the unit system', async () => {
    const { status, json } = await call('PATCH', `/projects/${id}`, {
      rigName: null,
      unitSystem: UNIT_SYSTEM_PRESETS.workbook,
    });
    expect(status).toBe(200);
    expect(json.data.rigName).toBeNull();
    expect(json.data.unitSystem).toEqual(UNIT_SYSTEM_PRESETS.workbook);
    expect(json.data.operator).toBe('POGC');
  });

  it('lists active projects with pagination meta', async () => {
    await call('POST', '/projects', { ...sava, name: 'Another', currency: '€' });
    const { status, json } = await call('GET', '/projects?sort=name:asc&pageSize=1');
    expect(status).toBe(200);
    expect(json.meta).toEqual({ page: 1, pageSize: 1, total: 2 });
    expect(json.data.map((p: { name: string }) => p.name)).toEqual(['Another']);
  });

  it('archives instead of deleting', async () => {
    const { status, json } = await call('POST', `/projects/${id}/archive`);
    expect(status).toBe(200);
    expect(json.data.archivedAt).toBeString();
    const active = await call('GET', '/projects');
    expect(active.json.data.map((p: { id: string }) => p.id)).not.toContain(id);
    const archived = await call('GET', '/projects?archived=true');
    expect(archived.json.data.map((p: { id: string }) => p.id)).toEqual([id]);
    expect((await call('GET', `/projects/${id}`)).status).toBe(200);
  });

  it('rejects a duplicate name with 409 CONFLICT', async () => {
    const { status, json } = await call('POST', '/projects', sava);
    expect(status).toBe(409);
    expect(json.error.code).toBe('CONFLICT');
    expect(json.error.details.constraint).toBe('projects_name_unique');
  });

  it('answers validation errors on the right field', async () => {
    const missing = await call('POST', '/projects', { ...sava, name: '  ', unknown: 1 });
    expect(missing.status).toBe(422);
    const paths = missing.json.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain('body.name');

    const badUnit = await call('PATCH', `/projects/${id}`, {
      unitSystem: { ...UNIT_SYSTEM_PRESETS.si, density: 'bbl' },
    });
    expect(badUnit.status).toBe(422);
    expect(badUnit.json.error.details[0].path).toBe('body.unitSystem.density');

    const empty = await call('PATCH', `/projects/${id}`, {});
    expect(empty.status).toBe(422);
  });

  it('answers 404 for an unknown project and 422 for a malformed id', async () => {
    const unknown = await call('GET', `/projects/${crypto.randomUUID()}`);
    expect(unknown.status).toBe(404);
    expect(unknown.json.error.message).toBe('Project not found');
    const malformed = await call('GET', '/projects/not-a-uuid');
    expect(malformed.status).toBe(422);
    expect(malformed.json.error.details[0].path).toBe('params.projectId');
  });
});
