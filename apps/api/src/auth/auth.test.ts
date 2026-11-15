import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createApp } from '../app';
import { createTestDb, type TestDb } from '../test/db';
import { createAuth } from './auth';

// The real better-auth: sign-in, cookie flags, 401 / 403 per role, closed sign-up and the
// author columns (docs/07). Every other test signs in as a stub admin (`test/session.ts`).

const config = {
  secret: 'test-secret-test-secret-test-secret-123',
  baseURL: 'http://localhost',
  production: false,
  rateLimit: false,
};
const PASSWORD = 'correct horse battery';

let testDb: TestDb;
let app: ReturnType<typeof createApp>;
let ids: Record<string, string> = {};

async function makeUser(role: string) {
  const context = await createAuth(testDb.db, config).$context;
  const created = await context.internalAdapter.createUser(
    { email: `${role}@example.test`, name: role, emailVerified: true, role },
    { method: 'admin' },
  );
  await context.internalAdapter.createAccount({
    userId: created.id,
    providerId: 'credential',
    accountId: created.id,
    password: await context.password.hash(PASSWORD),
  });
  return created.id;
}

// biome-ignore lint/suspicious/noExplicitAny: tests read untyped JSON bodies
const json = async (res: Response): Promise<any> => res.json();

const api = (path: string, init: RequestInit = {}) =>
  app.handle(new Request(`http://localhost${path}`, init));

async function signIn(role: string) {
  const res = await api('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({ email: `${role}@example.test`, password: PASSWORD }),
  });
  return {
    res,
    cookie: res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; '),
  };
}

const call = (cookie: string, method: string, path: string, body?: unknown) =>
  api(`/api/v1${path}`, {
    method,
    headers: {
      cookie,
      origin: 'http://localhost',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

beforeAll(async () => {
  testDb = await createTestDb();
  app = createApp({
    log: { production: true, level: 'error', write: () => {} },
    db: testDb.db,
    auth: config,
  });
  for (const role of ['admin', 'coordinator', 'engineer', 'client']) {
    ids = { ...ids, [role]: await makeUser(role) };
  }
});
afterAll(() => testDb.drop());

describe('authentication', () => {
  it('answers 401 without a session, with the standard error body', async () => {
    const res = await api('/api/v1/projects');
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe('UNAUTHENTICATED');
  });

  it('keeps /api/health public', async () => {
    expect((await api('/api/health')).status).toBe(200);
  });

  it('signs in with email and password; the cookie is HttpOnly, SameSite=Lax, path /', async () => {
    const { res } = await signIn('admin');
    expect(res.status).toBe(200);
    const cookie = res.headers.getSetCookie().find((c) => c.includes('session_token')) ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/Max-Age=\d+/);
  });

  it('does not say whether an email exists', async () => {
    const wrongPassword = await api('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ email: 'admin@example.test', password: 'wrong password!' }),
    });
    const unknown = await api('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ email: 'nobody@example.test', password: 'wrong password!' }),
    });
    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await json(wrongPassword)).message).toBe((await json(unknown)).message);
  });

  it('has no sign-up: an admin creates users', async () => {
    const res = await api('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ email: 'new@example.test', password: PASSWORD, name: 'New' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('authorization by role', () => {
  it('lets each role do what the matrix of docs/07 gives it, and refuses the rest with 403', async () => {
    const project = { name: 'SAVA', operator: 'POGC', currency: '$' };
    const admin = (await signIn('admin')).cookie;
    const coordinator = (await signIn('coordinator')).cookie;
    const engineer = (await signIn('engineer')).cookie;
    const client = (await signIn('client')).cookie;

    // project:manage: admin and coordinator only.
    const created = await call(admin, 'POST', '/projects', project);
    expect(created.status).toBe(201);
    expect((await call(coordinator, 'POST', '/projects', { ...project, name: 'Two' })).status).toBe(
      201,
    );
    expect((await call(engineer, 'POST', '/projects', { ...project, name: 'Three' })).status).toBe(
      403,
    );
    expect((await call(client, 'POST', '/projects', { ...project, name: 'Four' })).status).toBe(
      403,
    );

    // report:read: everyone signed in.
    for (const cookie of [admin, coordinator, engineer, client]) {
      expect((await call(cookie, 'GET', '/projects')).status).toBe(200);
    }

    // report:write (a report of a well): not the coordinator, not the client.
    const projectId = (await json(created)).data.id;
    const well = await call(admin, 'POST', `/projects/${projectId}/wells`, {
      name: 'W1',
      wellType: 'vertical',
      rigType: 'onshore',
    });
    const wellId = (await json(well)).data.id;
    const section = await call(admin, 'POST', `/wells/${wellId}/sections`, {
      holeSize: 0.2,
      fluidType: 'wbm',
    });
    const body = { sectionId: (await json(section)).data.id, reportDate: '2026-08-01' };
    expect((await call(client, 'POST', `/wells/${wellId}/reports`, body)).status).toBe(403);
    expect((await call(coordinator, 'POST', `/wells/${wellId}/reports`, body)).status).toBe(403);
    expect((await call(engineer, 'POST', `/wells/${wellId}/reports`, body)).status).toBe(201);
  });

  it('refuses a state-changing request from another origin', async () => {
    const { cookie } = await signIn('admin');
    const res = await api('/api/v1/projects', {
      method: 'POST',
      headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X', operator: 'Y', currency: '$' }),
    });
    expect(res.status).toBe(403);
    const noOrigin = await api('/api/v1/projects', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X', operator: 'Y', currency: '$' }),
    });
    expect(noOrigin.status).toBe(403);
  });
});

describe('authorship', () => {
  it('writes the user of the session into created_by and updated_by', async () => {
    const { cookie } = await signIn('admin');
    const res = await call(cookie, 'POST', '/projects', {
      name: 'Mine',
      operator: 'O',
      currency: '$',
    });
    const id = (await json(res)).data.id;
    const row = await testDb.db.execute<{ created_by: string; updated_by: string | null }>(
      sql`select created_by, updated_by from projects where id = ${id}`,
    );
    expect(row.rows[0]?.created_by).toBe(ids.admin as string);
    await call(cookie, 'PATCH', `/projects/${id}`, { name: 'Renamed' });
    const after = await testDb.db.execute<{ updated_by: string | null }>(
      sql`select updated_by from projects where id = ${id}`,
    );
    expect(after.rows[0]?.updated_by).toBe(ids.admin as string);
  });

  it('a banned user has no session access', async () => {
    const { cookie } = await signIn('client');
    expect((await call(cookie, 'GET', '/projects')).status).toBe(200);
    await testDb.db.execute(sql`update "user" set banned = true where id = ${ids.client}`);
    expect((await call(cookie, 'GET', '/projects')).status).toBe(401);
  });
});
