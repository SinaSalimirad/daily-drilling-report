import { afterAll, describe, expect, it } from 'bun:test';
import { createApp } from '../../app';
import { env } from '../../config/env';
import { createDb } from '../../db/client';

// Runs against the real PostgreSQL of DATABASE_URL (docs/09-testing-strategy.md).

const log = { production: true, level: 'error' as const, write: () => {} };
const live = createDb(env.DATABASE_URL);
const dead = createDb('postgres://nobody:nothing@127.0.0.1:1/none');
afterAll(async () => {
  await live.pool.end();
  await dead.pool.end();
});

const get = (db: typeof live.db, path: string) =>
  createApp({ log, db }).handle(new Request(`http://localhost${path}`));

describe('GET /api/health', () => {
  it('returns 200 when the database answers', async () => {
    const res = await get(live.db, '/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { status: 'ok', database: 'up' } });
  });

  it('returns 503 when the database is down', async () => {
    const res = await get(dead.db, '/api/health');
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message).toBe('Database is not reachable');
  });

  it('is not served without the /api prefix', async () => {
    expect((await get(live.db, '/health')).status).toBe(404);
  });
});
