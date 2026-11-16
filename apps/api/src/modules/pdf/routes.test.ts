import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';
import { sessionCookies } from './service';

// PDF export (v1.1.0): the route checks the report, asks Gotenberg to print the web page with
// the caller's session cookie and returns the file. Gotenberg is replaced by a small HTTP
// server that records what it receives and answers like Gotenberg.

let testDb: TestDb;
let app: ReturnType<typeof createApp>;
let gotenberg: ReturnType<typeof Bun.serve>;
type Received = {
  path: string;
  trace: string | null;
  form: Awaited<ReturnType<Request['formData']>>;
};
let received: Received[] = [];
let failNext = false;

const PDF = '%PDF-1.7 fake';

beforeAll(async () => {
  gotenberg = Bun.serve({
    port: 0,
    async fetch(request) {
      received.push({
        path: new URL(request.url).pathname,
        trace: request.headers.get('gotenberg-trace'),
        form: await request.formData(),
      });
      if (failNext) {
        failNext = false;
        return new Response('Chromium failed', { status: 503 });
      }
      return new Response(PDF, { headers: { 'content-type': 'application/pdf' } });
    },
  });
  testDb = await createTestDb();
  app = createApp({
    session: asAdmin,
    log: { production: true, level: 'error', write: () => {} },
    db: testDb.db,
    pdf: { gotenbergUrl: `http://localhost:${gotenberg.port}`, pageOrigin: 'http://nginx' },
  });
});
afterAll(async () => {
  gotenberg.stop(true);
  await testDb.drop();
});

// biome-ignore lint/suspicious/noExplicitAny: tests read untyped JSON bodies
type Json = any;

const request = (
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
const json = async (res: Response): Promise<Json> => res.json();

describe('GET /reports/:reportId/pdf', () => {
  let reportId: string;

  beforeAll(async () => {
    const project = await json(
      await request('POST', '/projects', { name: 'P', operator: 'O', currency: '$' }),
    );
    const well = await json(
      await request('POST', `/projects/${project.data.id}/wells`, {
        name: 'PYW-24 ST1',
        wellType: 'vertical',
        rigType: 'onshore',
      }),
    );
    const section = await json(
      await request('POST', `/wells/${well.data.id}/sections`, { holeSize: 0.2, fluidType: 'wbm' }),
    );
    const report = await json(
      await request('POST', `/wells/${well.data.id}/reports`, {
        sectionId: section.data.id,
        reportDate: '2026-08-01',
      }),
    );
    reportId = report.data.id;
  });

  it('prints the report page through Gotenberg with the session cookie only', async () => {
    received = [];
    const res = await request('GET', `/reports/${reportId}/pdf`, undefined, {
      cookie: 'theme=dark; better-auth.session_token=abc.def; tracking=1',
      'x-request-id': 'req-123',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="PYW-24-ST1-report-1.pdf"',
    );
    expect(await res.text()).toBe(PDF);

    expect(received).toHaveLength(1);
    const call = received[0];
    expect(call?.path).toBe('/forms/chromium/convert/url');
    expect(call?.trace).toBe('req-123');
    expect(call?.form.get('url')).toBe(`http://nginx/reports/${reportId}/print`);
    expect(JSON.parse(String(call?.form.get('extraHttpHeaders')))).toEqual({
      Cookie: 'better-auth.session_token=abc.def',
    });
    expect(call?.form.get('waitForExpression')).toBe('window.__ddrPrintReady === true');
    expect(call?.form.get('preferCssPageSize')).toBe('true');
  });

  it('prints the inventory page when asked', async () => {
    received = [];
    const res = await request('GET', `/reports/${reportId}/pdf?page=inventory`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain('PYW-24-ST1-inventory-1.pdf');
    expect(received[0]?.form.get('url')).toBe(`http://nginx/reports/${reportId}/inventory/print`);
  });

  it('answers 502 PDF_RENDER_FAILED when Gotenberg fails', async () => {
    failNext = true;
    const res = await request('GET', `/reports/${reportId}/pdf`);
    expect(res.status).toBe(502);
    const body = await json(res);
    expect(body.error.code).toBe('PDF_RENDER_FAILED');
    expect(body.error.details).toEqual({ status: 503 });
  });

  it('checks the report before rendering: 404 unknown, 422 unknown page', async () => {
    received = [];
    const unknown = await request('GET', '/reports/00000000-0000-4000-8000-000000000000/pdf');
    expect(unknown.status).toBe(404);
    const badPage = await request('GET', `/reports/${reportId}/pdf?page=recap`);
    expect(badPage.status).toBe(422);
    expect(received).toHaveLength(0);
  });
});

describe('sessionCookies', () => {
  it('keeps the better-auth cookies, with or without the __Secure- prefix', () => {
    expect(
      sessionCookies('a=1; __Secure-better-auth.session_token=x; better-auth.session_data=y; b=2'),
    ).toBe('__Secure-better-auth.session_token=x; better-auth.session_data=y');
    expect(sessionCookies(null)).toBe('');
  });
});
