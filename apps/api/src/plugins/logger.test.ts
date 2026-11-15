import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { logger } from './logger';
import { requestId } from './request-id';

function setup(level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
  const lines: Record<string, unknown>[] = [];
  const app = new Elysia()
    .use(requestId)
    .use(logger({ production: true, level, write: (line) => lines.push(JSON.parse(line)) }))
    .get('/wells/:id', ({ requestId }) => ({ requestId }))
    .post('/echo', ({ body }) => body);
  return { app, lines };
}

const settle = () => Bun.sleep(20);

describe('request id', () => {
  it('reuses a valid X-Request-Id and returns it', async () => {
    const { app } = setup();
    const res = await app.handle(
      new Request('http://localhost/wells/1', { headers: { 'x-request-id': 'nginx-abc.1' } }),
    );
    expect(res.headers.get('x-request-id')).toBe('nginx-abc.1');
    expect(await res.json()).toEqual({ requestId: 'nginx-abc.1' });
  });

  it('generates a UUID when the header is missing or malformed', async () => {
    const { app } = setup();
    const cases: Record<string, string>[] = [{}, { 'x-request-id': 'bad id <script>' }];
    for (const headers of cases) {
      const res = await app.handle(new Request('http://localhost/wells/1', { headers }));
      expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

describe('logger', () => {
  it('writes one line with requestId, method, path, status and duration', async () => {
    const { app, lines } = setup();
    await app.handle(
      new Request('http://localhost/wells/42?q=1', { headers: { 'x-request-id': 'r-1' } }),
    );
    await settle();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'info',
      requestId: 'r-1',
      method: 'GET',
      path: '/wells/42',
      status: 200,
    });
    expect(typeof lines[0]?.durationMs).toBe('number');
    expect(typeof lines[0]?.time).toBe('string');
  });

  it('does not log headers, cookies, query strings or bodies', async () => {
    const { app, lines } = setup();
    await app.handle(
      new Request('http://localhost/echo?token=SECRET', {
        method: 'POST',
        body: JSON.stringify({ password: 'SECRET' }),
        headers: {
          'content-type': 'application/json',
          cookie: 'sid=SECRET',
          authorization: 'Bearer SECRET',
        },
      }),
    );
    await settle();
    expect(lines).toHaveLength(1);
    expect(JSON.stringify(lines)).not.toContain('SECRET');
  });

  it('respects the level threshold', async () => {
    const { app, lines } = setup('warn');
    await app.handle(new Request('http://localhost/wells/1'));
    await app.handle(new Request('http://localhost/missing'));
    await settle();
    expect(lines.map((l) => l.status)).toEqual([404]);
  });
});
