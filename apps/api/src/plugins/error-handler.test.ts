import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { createApp } from '../app';
import { createDb } from '../db/client';
import { BusinessRuleError, NotFoundError } from '../lib/errors';

class FakePgError extends Error {
  constructor(
    readonly code: string,
    readonly constraint: string,
  ) {
    super(`duplicate key value violates unique constraint "${constraint}" (SQL text)`);
  }
}

function setup() {
  const lines: Record<string, unknown>[] = [];
  // No route here touches the database; an unreachable address is enough.
  const { db } = createDb('postgres://nobody:nothing@127.0.0.1:1/none');
  const app = createApp({
    log: { production: true, level: 'debug', write: (line) => lines.push(JSON.parse(line)) },
    db,
  })
    .post('/wells/:wellId', ({ body }) => body, {
      params: z.object({ wellId: z.coerce.number() }),
      body: z.object({ mudWeight: z.number(), pit: z.object({ name: z.string() }) }).strict(),
    })
    .get('/boom', () => {
      throw new Error('connection string postgres://secret@db leaked');
    })
    .get('/well', () => {
      throw new NotFoundError('Well not found');
    })
    .get('/rule', () => {
      throw new BusinessRuleError('REPORT_DATE_TAKEN', 'A report already exists for this date', {
        reportDate: '2026-07-28',
      });
    })
    .get('/unique', () => {
      throw new FakePgError('23505', 'daily_reports_well_id_report_date_unique');
    })
    .get('/in-use', () => {
      throw Object.assign(new Error('wrapped by drizzle'), {
        cause: new FakePgError('23503', 'pits_project_id_fk'),
      });
    });
  const call = async (path: string, init?: RequestInit) => {
    const res = await app.handle(
      new Request(`http://localhost/api${path}`, {
        ...init,
        headers: { 'x-request-id': 'req-1', 'content-type': 'application/json' },
      }),
    );
    // biome-ignore lint/suspicious/noExplicitAny: test reads an untyped JSON body
    return { status: res.status, body: (await res.json()) as any, header: res.headers };
  };
  return { call, lines };
}

const settle = () => Bun.sleep(20);

describe('error handler', () => {
  it('answers a validation failure with 422 VALIDATION_FAILED and details[].path', async () => {
    const { call } = setup();
    const { status, body } = await call('/wells/1', {
      method: 'POST',
      body: JSON.stringify({ mudWeight: 'heavy', pit: {}, extra: 1 }),
    });
    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.requestId).toBe('req-1');
    const paths = body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain('body.mudWeight');
    expect(paths).toContain('body.pit.name');
    expect(body.data).toBeUndefined();
  });

  it('answers malformed JSON with 422 VALIDATION_FAILED', async () => {
    const { call } = setup();
    const { status, body } = await call('/wells/1', { method: 'POST', body: '{oops' });
    expect(status).toBe(422);
    expect(body.error).toMatchObject({ code: 'VALIDATION_FAILED', details: [{ path: 'body' }] });
  });

  it('answers an unknown route with 404 in the same shape', async () => {
    const { call } = setup();
    const { status, body, header } = await call('/nothing-here');
    expect(status).toBe(404);
    expect(body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route not found', requestId: 'req-1' },
    });
    expect(header.get('x-request-id')).toBe('req-1');
  });

  it('answers a thrown plain Error with 500 INTERNAL and no internal text', async () => {
    const { call, lines } = setup();
    const { status, body } = await call('/boom');
    expect(status).toBe(500);
    expect(body).toEqual({
      error: { code: 'INTERNAL', message: 'An unexpected error occurred', requestId: 'req-1' },
    });
    expect(JSON.stringify(body)).not.toContain('secret');
    await settle();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'error', status: 500, errorCode: 'INTERNAL' });
    expect(String(lines[0]?.stack)).toContain('error-handler.test.ts');
  });

  it('passes AppError subclasses through with their status, code and details', async () => {
    const { call, lines } = setup();
    expect((await call('/well')).body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Well not found',
    });
    const rule = await call('/rule');
    expect(rule.status).toBe(422);
    expect(rule.body.error).toMatchObject({
      code: 'REPORT_DATE_TAKEN',
      details: { reportDate: '2026-07-28' },
    });
    await settle();
    expect(lines.map((l) => [l.level, l.errorCode, l.stack])).toEqual([
      ['warn', 'NOT_FOUND', undefined],
      ['warn', 'REPORT_DATE_TAKEN', undefined],
    ]);
  });

  it('maps PostgreSQL 23505 to CONFLICT and 23503 to IN_USE, naming the constraint', async () => {
    const { call } = setup();
    const unique = await call('/unique');
    expect(unique.status).toBe(409);
    expect(unique.body.error).toMatchObject({
      code: 'CONFLICT',
      details: { constraint: 'daily_reports_well_id_report_date_unique' },
    });
    expect(unique.body.error.message).not.toContain('SQL');
    const inUse = await call('/in-use');
    expect(inUse.status).toBe(409);
    expect(inUse.body.error).toMatchObject({
      code: 'IN_USE',
      details: { constraint: 'pits_project_id_fk' },
    });
  });
});
