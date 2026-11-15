import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { guard } from './guard';

describe('guard', () => {
  it('lets a route that declares a permission through (open until v0.9.0)', async () => {
    const app = new Elysia()
      .use(guard)
      .get('/api/v1/wells', () => 'ok', { permission: 'report:read' });
    const res = await app.handle(new Request('http://localhost/api/v1/wells'));
    expect(res.status).toBe(200);
  });

  it('only accepts known permission names (type check)', () => {
    new Elysia().use(guard).get('/x', () => 'ok', {
      // @ts-expect-error — not a permission of docs/07
      permission: 'report:everything',
    });
    expect(true).toBe(true);
  });
});
