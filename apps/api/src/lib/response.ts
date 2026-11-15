// Success bodies of docs/04-api-conventions.md. A body never has both `data` and `error`.

/** Warning codes (docs/05-error-flow.md). Grow this list; never reuse a code. */
export type WarningCode =
  | 'VOLUME_NOT_BALANCED'
  | 'NEGATIVE_STOCK'
  | 'ACTIVITY_HOURS_NOT_24'
  | 'SURVEY_NOT_UPDATED';

export type Warning = { code: WarningCode; message: string; details?: Record<string, unknown> };

export type PageMeta = { page: number; pageSize: number; total: number };

export function ok<T>(data: T, warnings?: Warning[]): { data: T; warnings?: Warning[] } {
  return warnings && warnings.length > 0 ? { data, warnings } : { data };
}

export function list<T>(data: T[], meta: PageMeta): { data: T[]; meta: PageMeta } {
  return { data, meta };
}
