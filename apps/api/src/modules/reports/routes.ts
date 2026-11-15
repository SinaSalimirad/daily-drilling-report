import {
  reportCreateSchema,
  reportListQuerySchema,
  reportParamsSchema,
  reportSchema,
  reportSubmitSchema,
  reportUpdateSchema,
  wellParamsSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { logEvent } from '../../lib/events';
import { list, ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { composeReportServices } from './compose';

// Reports are nested under their well for list / create, and addressed directly otherwise.

const warning = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
const one = z.object({ data: reportSchema, warnings: z.array(warning).optional() });
const many = z.object({
  data: z.array(reportSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});

export const reportsRoutes = (db: Db) => {
  const { reports: service } = composeReportServices(db);
  return new Elysia({ name: 'reports' })
    .use(guard)
    .get(
      '/wells/:wellId/reports',
      async ({ params, query }) => {
        const { data, meta } = await service.listByWell(params.wellId, query);
        return list(data, meta);
      },
      {
        permission: 'report:read',
        params: wellParamsSchema,
        query: reportListQuerySchema,
        response: { 200: many },
      },
    )
    .post(
      '/wells/:wellId/reports',
      async ({ params, body, set, request, store }) => {
        const report = await service.create(params.wellId, body);
        logEvent({ request, store }, 'report.created', {
          reportId: report.id,
          wellId: report.wellId,
        });
        set.status = 201;
        return ok(report, await service.warnings(report.id));
      },
      {
        permission: 'report:write',
        params: wellParamsSchema,
        body: reportCreateSchema,
        response: { 201: one },
      },
    )
    .get('/reports/:reportId', async ({ params }) => ok(await service.get(params.reportId)), {
      permission: 'report:read',
      params: reportParamsSchema,
      response: { 200: one },
    })
    .patch(
      '/reports/:reportId',
      async ({ params, body, request, store }) => {
        const report = await service.update(params.reportId, body);
        if (report.status === 'submitted') {
          logEvent({ request, store }, 'report.edited_after_submit', {
            reportId: report.id,
            revision: report.revision,
          });
        }
        return ok(report, await service.warnings(report.id));
      },
      {
        permission: 'report:write',
        params: reportParamsSchema,
        body: reportUpdateSchema,
        response: { 200: one },
      },
    )
    .post(
      '/reports/:reportId/submit',
      async ({ params, body, request, store }) => {
        const report = await service.submit(params.reportId, body);
        logEvent({ request, store }, 'report.submitted', {
          reportId: report.id,
          revision: report.revision,
        });
        if (report.acknowledgedWarnings.length > 0) {
          logEvent({ request, store }, 'report.warnings_acknowledged', {
            reportId: report.id,
            warningCodes: report.acknowledgedWarnings,
          });
        }
        return ok(report);
      },
      {
        permission: 'report:submit',
        params: reportParamsSchema,
        body: reportSubmitSchema,
        response: { 200: one },
      },
    )
    .delete(
      '/reports/:reportId',
      async ({ params, set, request, store }) => {
        await service.remove(params.reportId);
        logEvent({ request, store }, 'report.deleted', { reportId: params.reportId });
        set.status = 204;
      },
      {
        permission: 'report:delete',
        params: reportParamsSchema,
        response: { 204: z.undefined() },
      },
    );
};
