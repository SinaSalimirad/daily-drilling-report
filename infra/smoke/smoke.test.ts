import { describe, expect, it } from 'bun:test';

// End-to-end smoke test (docs/09: "from v1.0.0: one smoke test — create a report, submit, print
// view"). It talks to a RUNNING deployment through its public URL, like a browser would:
// sign in, set up a small well, create report 1, fill it, submit it, read the printed data.
//
//   SMOKE_URL=http://localhost SMOKE_EMAIL=admin@example.com SMOKE_PASSWORD=… bun test infra/smoke
//
// It writes data (a project named "SMOKE …"), so run it against a scratch stack, as the release
// workflow does, never against production. Without SMOKE_URL it is skipped.
//
// Browser automation (clicking through the pages) is not part of it: the tool is not decided
// (docs/09 names none), see known-issues KI-009.

const URL_BASE = Bun.env.SMOKE_URL;
const EMAIL = Bun.env.SMOKE_EMAIL ?? '';
const PASSWORD = Bun.env.SMOKE_PASSWORD ?? '';

describe.skipIf(!URL_BASE)('smoke: the daily flow', () => {
  let cookie = '';
  const stamp = Date.now();

  // biome-ignore lint/suspicious/noExplicitAny: the smoke test reads untyped JSON bodies
  async function call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: any }> {
    const res = await fetch(`${URL_BASE}/api/v1${path}`, {
      method,
      headers: {
        cookie,
        origin: new URL(URL_BASE as string).origin,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : undefined };
  }

  it('is up and refuses anonymous requests', async () => {
    const health = await fetch(`${URL_BASE}/api/health`);
    expect(health.status).toBe(200);
    const anonymous = await fetch(`${URL_BASE}/api/v1/projects`);
    expect(anonymous.status).toBe(401);
  });

  it('signs in', async () => {
    const res = await fetch(`${URL_BASE}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: new URL(URL_BASE as string).origin },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    expect(res.status).toBe(200);
    cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
    expect(cookie).toContain('session_token');
  });

  it('sets up a well and a product, creates and fills report 1, submits it and reads the results', async () => {
    const project = await call('POST', '/projects', {
      name: `SMOKE ${stamp}`,
      operator: 'Smoke operator',
      currency: '$',
    });
    expect(project.status).toBe(201);
    const projectId = project.json.data.id;

    const well = await call('POST', `/projects/${projectId}/wells`, {
      name: `SMOKE-1 ${stamp}`,
      wellType: 'vertical',
      rigType: 'onshore',
      spudDate: '2026-07-28',
    });
    expect(well.status).toBe(201);
    const wellId = well.json.data.id;

    const section = await call('POST', `/wells/${wellId}/sections`, {
      holeSize: 0.2159,
      fluidType: 'wbm',
    });
    expect(section.status).toBe(201);

    const pit = await call('POST', `/projects/${projectId}/pits`, {
      name: 'Active 1',
      capacity: 60,
    });
    expect(pit.status).toBe(201);
    const product = await call('POST', '/products', {
      name: `Smoke barite ${stamp}`,
      packageSize: 25,
      packageUnit: 'kg',
      specificGravity: 4.2,
    });
    expect(product.status).toBe(201);
    const price = await call('POST', `/projects/${projectId}/products`, {
      productId: product.json.data.id,
      origin: 'local',
      unitPrice: 10,
    });
    expect(price.status).toBe(201);

    // Report 1: number 1 and the spud date.
    const report = await call('POST', `/wells/${wellId}/reports`, {
      sectionId: section.json.data.id,
    });
    expect(report.status).toBe(201);
    expect(report.json.data).toMatchObject({
      reportNo: 1,
      reportDate: '2026-07-28',
      status: 'draft',
    });
    const reportId = report.json.data.id;

    const header = await call('PATCH', `/reports/${reportId}`, {
      revision: report.json.data.revision,
      bitDepth: 100,
      td: 100,
      formation: 'Smoke formation',
    });
    expect(header.status).toBe(200);

    const inventory = await call('PUT', `/reports/${reportId}/inventory`, {
      moves: [{ projectProductId: price.json.data.id, received: 40, used: 4 }],
    });
    expect(inventory.status).toBe(200);
    expect(inventory.json.data.rows[0]).toMatchObject({
      received: 40,
      used: 4,
      finalStock: 36,
      dailyCost: 40,
    });

    const pits = await call('PUT', `/reports/${reportId}/pit-readings`, {
      readings: [{ pitId: pit.json.data.id, pitType: 'active', volume: 30, mudWeight: 1200 }],
    });
    expect(pits.status).toBe(200);

    // The 24 h activity warning is open: submitting needs the acknowledgement.
    const refused = await call('POST', `/reports/${reportId}/submit`, {
      revision: header.json.data.revision,
    });
    expect(refused.status).toBe(422);
    expect(refused.json.error.code).toBe('WARNINGS_NOT_ACKNOWLEDGED');
    const submitted = await call('POST', `/reports/${reportId}/submit`, {
      revision: header.json.data.revision,
      acknowledgeWarnings: true,
    });
    expect(submitted.status).toBe(200);
    expect(submitted.json.data.status).toBe('submitted');

    // The print view reads the stored snapshot.
    const results = await call('GET', `/reports/${reportId}/results`);
    expect(results.status).toBe(200);
    expect(results.json.data.source).toBe('snapshot');
    expect(results.json.data.payload.inventory.rows[0].finalStock).toBe(36);

    const recap = await call('GET', `/wells/${wellId}/recap?scope=well`);
    expect(recap.status).toBe(200);
    expect(recap.json.data.cost.total).toBe(40);
  });
});
