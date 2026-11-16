import type { App } from '@ddr/api';
import { treaty } from '@elysiajs/eden';

// The one Eden Treaty client (docs/02-folder-structure.md). Components never call it
// directly; feature hooks wrap it with `unwrap` and TanStack Query.
// Web and API share one origin behind Nginx; the `/api` prefix is part of `type App`,
// so the client is built on the page origin: `api.health.get()` → GET /api/health.

const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;

/**
 * File routes (docs/04 "Files"): a successful attachment becomes a `File` named by the server.
 * Anything else (JSON, errors) is left to Eden.
 */
async function attachment(response: Response): Promise<File | undefined> {
  const disposition = response.headers.get('content-disposition') ?? '';
  if (!response.ok || !disposition.startsWith('attachment')) return undefined;
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'download';
  const type = response.headers.get('content-type') ?? 'application/octet-stream';
  return new File([await response.blob()], name, { type });
}

export const api = treaty<App>(origin, {
  fetch: { credentials: 'same-origin' },
  onResponse: attachment,
  // Eden turns ISO-looking strings into Date objects by default. Our contract is strings
  // (docs/04: `YYYY-MM-DD`, ISO 8601) and the shared schemas type them as string, so a
  // Date at runtime would break `formatDate` and any string method on those fields.
  parseDate: false,
}).api;
