import type { App } from '@ddr/api';
import { treaty } from '@elysiajs/eden';

// The one Eden Treaty client (docs/02-folder-structure.md). Components never call it
// directly; feature hooks wrap it with `unwrap` and TanStack Query.
// Web and API share one origin behind Nginx; the `/api` prefix is part of `type App`,
// so the client is built on the page origin: `api.health.get()` → GET /api/health.

const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;

export const api = treaty<App>(origin, { fetch: { credentials: 'same-origin' } }).api;
