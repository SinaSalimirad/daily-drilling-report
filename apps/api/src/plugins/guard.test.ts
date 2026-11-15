import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import type { SessionUser } from '../auth/session';
import { errorHandler } from './error-handler';
import { guard } from './guard';

const user = (role: SessionUser['role']): SessionUser => ({
  id: '00000000-0000-4000-8000-0000000000aa',
  name: 'Test',
  email: 'test@example.test',
  role,
});

function appFor(authUser: SessionUser | null) {
  return new Elysia()
    .use(errorHandler)
    .derive({ as: 'global' }, () => ({ authUser }))
    .use(guard)
    .get('/read', () => 'ok', { permission: 'report:read' })
    .post('/write', () => 'ok', { permission: 'report:write' })
    .post('/users', () => 'ok', { permission: 'user:manage' });
}

const status = async (app: ReturnType<typeof appFor>, method: string, path: string) =>
  (await app.handle(new Request(`http://localhost${path}`, { method }))).status;

describe('guard', () => {
  it('answers 401 without a session', async () => {
    expect(await status(appFor(null), 'GET', '/read')).toBe(401);
  });

  it('lets a role through that has the permission, and refuses one that has not (403)', async () => {
    expect(await status(appFor(user('client')), 'GET', '/read')).toBe(200);
    expect(await status(appFor(user('client')), 'POST', '/write')).toBe(403);
    expect(await status(appFor(user('engineer')), 'POST', '/write')).toBe(200);
    expect(await status(appFor(user('coordinator')), 'POST', '/write')).toBe(403);
    expect(await status(appFor(user('coordinator')), 'POST', '/users')).toBe(403);
    expect(await status(appFor(user('admin')), 'POST', '/users')).toBe(200);
  });

  it('only accepts known permission names (type check)', () => {
    new Elysia().use(guard).get('/x', () => 'ok', {
      // @ts-expect-error — not a permission of docs/07
      permission: 'report:everything',
    });
    expect(true).toBe(true);
  });
});
