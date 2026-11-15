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
    // Scope: an engineer works only on assigned wells (well_members).
    expect((await call(engineer, 'POST', `/wells/${wellId}/reports`, body)).status).toBe(403);
    const assigned = await call(admin, 'PUT', `/wells/${wellId}/members`, {
      userIds: [ids.engineer, ids.client],
    });
    expect(assigned.status).toBe(200);
    expect((await json(assigned)).data.map((u: { role: string }) => u.role).sort()).toEqual([
      'client',
      'engineer',
    ]);
    expect((await call(engineer, 'POST', `/wells/${wellId}/reports`, body)).status).toBe(201);
  });

  it('keeps an unassigned engineer and a client away from the reports of a well', async () => {
    const admin = (await signIn('admin')).cookie;
    const engineer = (await signIn('engineer')).cookie;
    const client = (await signIn('client')).cookie;
    const wells = await json(await call(admin, 'GET', '/projects'));
    const projectId = wells.data[0].id;
    const other = await json(
      await call(admin, 'POST', `/projects/${projectId}/wells`, {
        name: 'Unassigned',
        wellType: 'vertical',
        rigType: 'onshore',
      }),
    );
    const otherWell = other.data.id;
    expect((await call(engineer, 'GET', `/wells/${otherWell}/reports`)).status).toBe(403);
    expect((await call(client, 'GET', `/wells/${otherWell}/reports`)).status).toBe(403);

    // The client sees a submitted report of its well, not a draft.
    const assigned = (await json(await call(admin, 'GET', '/projects'))).data[0].id;
    const list = await json(await call(admin, 'GET', `/projects/${assigned}/wells?pageSize=100`));
    const wellId = list.data.find((w: { name: string }) => w.name === 'W1').id;
    const reports = await json(await call(admin, 'GET', `/wells/${wellId}/reports`));
    const draft = reports.data[0];
    expect((await call(client, 'GET', `/reports/${draft.id}`)).status).toBe(403);
    expect((await json(await call(client, 'GET', `/wells/${wellId}/reports`))).data).toEqual([]);
    const submitted = await call(engineer, 'POST', `/reports/${draft.id}/submit`, {
      revision: draft.revision,
      acknowledgeWarnings: true,
    });
    expect(submitted.status).toBe(200);
    expect((await call(client, 'GET', `/reports/${draft.id}`)).status).toBe(200);
    expect((await json(await call(client, 'GET', `/wells/${wellId}/reports`))).data).toHaveLength(
      1,
    );
    // A client reads, it never writes.
    expect(
      (await call(client, 'PATCH', `/reports/${draft.id}`, { revision: 2, formation: 'x' })).status,
    ).toBe(403);
  });

  it('lets the coordinator edit a submitted report, and writes it to the audit log', async () => {
    const admin = (await signIn('admin')).cookie;
    const coordinator = (await signIn('coordinator')).cookie;
    const projectId = (await json(await call(admin, 'GET', '/projects'))).data[0].id;
    const wells = await json(await call(admin, 'GET', `/projects/${projectId}/wells?pageSize=100`));
    const wellId = wells.data.find((w: { name: string }) => w.name === 'W1').id;
    const report = (await json(await call(admin, 'GET', `/wells/${wellId}/reports`))).data[0];
    expect(report.status).toBe('submitted');
    const edited = await call(coordinator, 'PATCH', `/reports/${report.id}`, {
      revision: report.revision,
      formation: 'Asmari',
    });
    expect(edited.status).toBe(200);
    const edits = (await json(await call(admin, 'GET', `/reports/${report.id}/edits`))).data;
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({
      userName: 'coordinator',
      action: 'report.edited_after_submit',
      revisionBefore: report.revision,
      revisionAfter: report.revision + 1,
      changes: { resource: 'header', fields: ['formation'] },
    });
    // The coordinator may not touch a draft: write the next report, it is refused.
    const section = report.sectionId;
    const draft = await call(admin, 'POST', `/wells/${wellId}/reports`, { sectionId: section });
    const draftReport = (await json(draft)).data;
    expect(
      (
        await call(coordinator, 'PATCH', `/reports/${draftReport.id}`, {
          revision: 1,
          formation: 'x',
        })
      ).status,
    ).toBe(403);
  });

  it('lets an admin create users, reset passwords and deactivate them', async () => {
    const admin = (await signIn('admin')).cookie;
    const engineer = (await signIn('engineer')).cookie;
    expect((await call(engineer, 'GET', '/users')).status).toBe(403);
    const created = await call(admin, 'POST', '/users', {
      name: 'New engineer',
      email: 'New.Engineer@example.test',
      password: 'a long enough password',
      role: 'engineer',
    });
    expect(created.status).toBe(201);
    const user = (await json(created)).data;
    expect(user).toMatchObject({
      email: 'new.engineer@example.test',
      role: 'engineer',
      banned: false,
    });
    const short = await call(admin, 'POST', '/users', {
      name: 'Short',
      email: 'short@example.test',
      password: 'short',
      role: 'client',
    });
    expect(short.status).toBe(422);
    expect(
      (await call(admin, 'POST', '/users', { ...user, password: 'a long enough password' })).status,
    ).toBe(422);

    const signed = await api('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ email: user.email, password: 'a long enough password' }),
    });
    expect(signed.status).toBe(200);
    const cookie = signed.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
    expect((await call(cookie, 'GET', '/projects')).status).toBe(200);

    // A password reset ends the sessions; deactivation ends them and blocks sign-in.
    expect(
      (
        await call(admin, 'PUT', `/users/${user.id}/password`, {
          password: 'another long password',
        })
      ).status,
    ).toBe(204);
    expect((await call(cookie, 'GET', '/projects')).status).toBe(401);
    expect((await call(admin, 'PATCH', `/users/${user.id}`, { banned: true })).status).toBe(200);
    const blocked = await api('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ email: user.email, password: 'another long password' }),
    });
    expect(blocked.status).toBeGreaterThanOrEqual(400);

    // An admin cannot deactivate or demote itself.
    const me = ids.admin;
    expect((await call(admin, 'PATCH', `/users/${me}`, { banned: true })).status).toBe(422);
    expect((await call(admin, 'PATCH', `/users/${me}`, { role: 'client' })).status).toBe(422);
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
