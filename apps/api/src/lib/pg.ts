// PostgreSQL error codes (https://www.postgresql.org/docs/current/errcodes-appendix.html).
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

/** PostgreSQL error code and constraint, also when wrapped by Drizzle (`cause`). */
export function pgError(error: unknown): { code: string; constraint?: string } | undefined {
  for (let e = error, depth = 0; e && typeof e === 'object' && depth < 3; depth++) {
    const { code, constraint, cause } = e as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) {
      return { code, constraint: typeof constraint === 'string' ? constraint : undefined };
    }
    e = cause;
  }
  return undefined;
}
