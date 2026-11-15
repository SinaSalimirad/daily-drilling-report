import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createApp } from '../app';
import { createTestDb, type TestDb } from '../test/db';

// Exit criterion of v0.9.0: every route enforces a permission. Every `/api/v1` route answers
// 401 to a request without a session, whatever its method; a route that forgot its
// `permission` would answer something else.

let testDb: TestDb;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  testDb = await createTestDb();
  app = createApp({
    log: { production: true, level: 'error', write: () => {} },
    db: testDb.db,
    auth: {
      secret: 'test-secret-test-secret-test-secret-123',
      baseURL: 'http://localhost',
      production: false,
    },
  });
});
afterAll(() => testDb.drop());

describe('route protection', () => {
  it('answers 401 on every /api/v1 route without a session', async () => {
    const routes = app.routes.filter((route) => route.path.startsWith('/api/v1/'));
    expect(routes.length).toBeGreaterThan(70);
    const id = '00000000-0000-4000-8000-000000000000';
    const failures: string[] = [];
    for (const route of routes) {
      const path = route.path.replace(/:[A-Za-z]+/g, id);
      const res = await app.handle(
        new Request(`http://localhost${path}`, {
          method: route.method,
          headers: { 'content-type': 'application/json' },
          body: ['GET', 'HEAD'].includes(route.method) ? undefined : '{}',
        }),
      );
      if (res.status !== 401) failures.push(`${route.method} ${route.path} → ${res.status}`);
    }
    expect(failures).toEqual([]);
  });

  it('leaves only the health check and the sign-in routes open', () => {
    const open = app.routes
      .filter((route) => !route.path.startsWith('/api/v1/'))
      .map((route) => route.path);
    expect([...new Set(open)].sort()).toEqual(['/api/auth/*', '/api/health']);
  });
});
