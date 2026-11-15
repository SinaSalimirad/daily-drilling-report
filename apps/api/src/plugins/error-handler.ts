import { Elysia } from 'elysia';
import type { LogixlysiaStore } from 'logixlysia';
import {
  AppError,
  ConflictError,
  type FieldIssue,
  NotFoundError,
  ValidationError,
} from '../lib/errors';
import { isReferencedError, PG_UNIQUE_VIOLATION, pgError } from '../lib/pg';
import { requestIdOf } from './request-id';

// docs/05-error-flow.md: the only place that writes an error body.
// The request log line (plugins/logger.ts) carries errorCode; 5xx also the stack.

const INTERNAL_MESSAGE = 'An unexpected error occurred';

type ElysiaValidation = { type?: string; all?: { path?: string; message?: string }[] };

/** Maps anything thrown to an AppError; undefined means a bug (500). */
export function toAppError(code: string | number, error: unknown): AppError | undefined {
  if (error instanceof AppError) return error;

  if (code === 'VALIDATION') {
    const { type, all } = error as ElysiaValidation;
    if (type === 'response') return undefined; // our own output is wrong: a bug
    const issues: FieldIssue[] = (all ?? []).map((issue) => ({
      path: [type, issue.path].filter(Boolean).join('.'),
      message: issue.message ?? 'Invalid value',
    }));
    return new ValidationError(issues);
  }
  if (code === 'PARSE') {
    return new ValidationError([{ path: 'body', message: 'Malformed request body' }]);
  }
  if (code === 'NOT_FOUND') return new NotFoundError('Route not found');

  const pg = pgError(error);
  const details = pg?.constraint ? { constraint: pg.constraint } : undefined;
  if (pg?.code === PG_UNIQUE_VIOLATION) {
    return new ConflictError('A record with these values already exists', details);
  }
  if (isReferencedError(error)) {
    return new ConflictError('The record is referenced by other records', details, 'IN_USE');
  }
  return undefined;
}

export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  { as: 'global' },
  ({ code, error, set, request, store }) => {
    const appError = toAppError(code, error);
    const status = appError?.status ?? 500;
    const errorCode = appError?.code ?? 'INTERNAL';

    const logger = (store as Partial<LogixlysiaStore> | undefined)?.logger;
    // 4xx: the code is enough. 5xx (bugs and failed dependencies): message and stack too.
    const detail = (appError?.cause ?? error) as Error | undefined;
    logger?.mergeContext(
      request,
      status < 500 ? { errorCode } : { errorCode, error: String(detail), stack: detail?.stack },
    );

    set.status = status;
    return {
      error: {
        code: errorCode,
        message: appError?.message ?? INTERNAL_MESSAGE,
        ...(appError?.details === undefined ? {} : { details: appError.details }),
        requestId: requestIdOf(request),
      },
    };
  },
);
