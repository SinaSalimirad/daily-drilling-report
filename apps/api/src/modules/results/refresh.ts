import { Elysia } from 'elysia';
import { currentUserId } from '../../auth/context';
import type { Db } from '../../db/client';
import { accessRepository } from '../access/repository';
import { composeReportServices } from '../reports/compose';

// A submitted report keeps a result snapshot (docs/03). Any successful write to a report —
// header patch, submit, activities, readings, inventory, samples … — rewrites the snapshot of a
// submitted report and marks the later reports stale. A write to a report that was already
// submitted is also an edit after submit: it goes to the audit log (docs/07).

const REPORT_WRITE = /^\/api\/v1\/reports\/([0-9a-f-]{36})(\/([a-z-]+))?/;

type Before = { status: string; revision: number };

export const resultsRefresh = (db: Db) => {
  const { reports, results } = composeReportServices(db);
  const access = accessRepository(db);
  const before = new WeakMap<Request, Before>();
  const target = (request: Request) => {
    if (request.method === 'GET' || request.method === 'DELETE') return undefined;
    const match = REPORT_WRITE.exec(new URL(request.url).pathname);
    return match ? { id: match[1] as string, part: match[3] } : undefined;
  };

  return new Elysia({ name: 'results-refresh' })
    .onBeforeHandle({ as: 'global' }, async ({ request }) => {
      const hit = target(request);
      if (!hit) return;
      const report = await reports.get(hit.id).catch(() => undefined);
      if (report) before.set(request, { status: report.status, revision: report.revision });
    })
    .onAfterHandle({ as: 'global' }, async ({ request, body }) => {
      const hit = target(request);
      if (!hit) return;
      const report = await reports.get(hit.id).catch(() => undefined);
      if (report?.status !== 'submitted') return;
      await results.snapshot(hit.id);
      const was = before.get(request);
      if (was?.status !== 'submitted') return; // the submit itself
      const fields =
        body && typeof body === 'object'
          ? Object.keys(body as object).filter((key) => key !== 'revision')
          : [];
      await access.addAudit({
        reportId: hit.id,
        userId: currentUserId() ?? null,
        action: 'report.edited_after_submit',
        revisionBefore: was.revision,
        revisionAfter: report.revision,
        changes: { resource: hit.part ?? 'header', fields },
      });
    });
};
