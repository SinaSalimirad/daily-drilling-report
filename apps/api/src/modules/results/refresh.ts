import { Elysia } from 'elysia';
import type { Db } from '../../db/client';
import { composeReportServices } from '../reports/compose';

// A submitted report keeps a result snapshot (docs/03). Any successful write to a
// submitted report — header patch, submit, activities, readings, inventory, samples … —
// rewrites its snapshot and marks the later reports stale.

const REPORT_WRITE = /^\/api\/v1\/reports\/([0-9a-f-]{36})(\/|$)/;

export const resultsRefresh = (db: Db) => {
  const { reports, results } = composeReportServices(db);
  return new Elysia({ name: 'results-refresh' }).onAfterHandle(
    { as: 'global' },
    async ({ request }) => {
      if (request.method === 'GET' || request.method === 'DELETE') return;
      const id = REPORT_WRITE.exec(new URL(request.url).pathname)?.[1];
      if (!id) return;
      const report = await reports.get(id).catch(() => undefined);
      if (report?.status === 'submitted') await results.snapshot(id);
    },
  );
};
