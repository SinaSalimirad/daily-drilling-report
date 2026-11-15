import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// Main path of the wells module (docs/09), in a schema of its own.

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

const well = {
  name: 'PYW-24ST1',
  designation: 'development',
  wellType: 'directional',
  rigType: 'onshore',
  spudDate: '2026-07-27',
};

describe('/api/v1 wells', () => {
  let projectId: string;
  let otherProjectId: string;
  let wellId: string;

  beforeAll(async () => {
    const project = { operator: 'POGC', currency: '$' };
    projectId = (await call('POST', '/projects', { ...project, name: 'SAVA' })).json.data.id;
    otherProjectId = (await call('POST', '/projects', { ...project, name: 'OTHER' })).json.data.id;
  });

  it('creates a well under its project', async () => {
    const { status, json } = await call('POST', `/projects/${projectId}/wells`, well);
    expect(status).toBe(201);
    expect(json.data).toMatchObject({ ...well, projectId, waterDepth: null, archivedAt: null });
    wellId = json.data.id;
  });

  it('reads it directly and lists it under the project', async () => {
    expect((await call('GET', `/wells/${wellId}`)).json.data.name).toBe('PYW-24ST1');
    const listed = await call('GET', `/projects/${projectId}/wells`);
    expect(listed.json.meta.total).toBe(1);
    expect(listed.json.data[0].id).toBe(wellId);
    expect((await call('GET', `/projects/${otherProjectId}/wells`)).json.meta.total).toBe(0);
  });

  it('updates it', async () => {
    const { status, json } = await call('PATCH', `/wells/${wellId}`, {
      rigType: 'offshore',
      waterDepth: 54.5,
    });
    expect(status).toBe(200);
    expect(json.data).toMatchObject({
      rigType: 'offshore',
      waterDepth: 54.5,
      spudDate: '2026-07-27',
    });
  });

  it('rejects a text spud date with VALIDATION_FAILED', async () => {
    for (const spudDate of ['27 July 2026', '2026-07-32', 'yesterday']) {
      const { status, json } = await call('POST', `/projects/${projectId}/wells`, {
        ...well,
        name: 'X',
        spudDate,
      });
      expect(status).toBe(422);
      expect(json.error.code).toBe('VALIDATION_FAILED');
      expect(json.error.details[0].path).toBe('body.spudDate');
    }
  });

  it('keeps well names unique inside a project (409), not across projects', async () => {
    const duplicate = await call('POST', `/projects/${projectId}/wells`, well);
    expect(duplicate.status).toBe(409);
    expect(duplicate.json.error).toMatchObject({
      code: 'CONFLICT',
      details: { constraint: 'wells_project_id_name_unique' },
    });
    expect((await call('POST', `/projects/${otherProjectId}/wells`, well)).status).toBe(201);
  });

  it('answers 404 for an unknown project or well', async () => {
    const missing = crypto.randomUUID();
    const create = await call('POST', `/projects/${missing}/wells`, well);
    expect(create.status).toBe(404);
    expect(create.json.error.message).toBe('Project not found');
    expect((await call('GET', `/projects/${missing}/wells`)).status).toBe(404);
    expect((await call('GET', `/wells/${missing}`)).json.error.message).toBe('Well not found');
  });

  it('archives instead of deleting', async () => {
    const { json } = await call('POST', `/wells/${wellId}/archive`);
    expect(json.data.archivedAt).toBeString();
    expect((await call('GET', `/projects/${projectId}/wells`)).json.meta.total).toBe(0);
    const archived = await call('GET', `/projects/${projectId}/wells?archived=true`);
    expect(archived.json.data.map((w: { id: string }) => w.id)).toEqual([wellId]);
  });
});
