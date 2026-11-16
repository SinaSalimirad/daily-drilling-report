import { pdfQuerySchema, reportParamsSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import type { Db } from '../../db/client';
import { guard } from '../../plugins/guard';
import { requestIdOf } from '../../plugins/request-id';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { composeReportServices } from '../reports/compose';
import { wellsRepository } from '../wells/repository';
import { wellsService } from '../wells/service';
import { gotenbergRenderer, type PdfRenderer } from './gotenberg';
import { pdfService, sessionCookies } from './service';

export type PdfConfig = {
  /** Base URL of Gotenberg, e.g. `http://gotenberg:3000`. */
  gotenbergUrl: string;
  /** Origin at which Gotenberg opens the web app's print pages, e.g. `http://nginx`. */
  pageOrigin: string;
  /** Replaces Gotenberg (tests). */
  renderer?: PdfRenderer;
};

// A file, not JSON (docs/04 "Files"): the body is the PDF, errors keep the usual JSON body.
export const pdfRoutes = (db: Db, config: PdfConfig) => {
  const { reports } = composeReportServices(db);
  const wells = wellsService(wellsRepository(db), projectsService(projectsRepository(db)));
  const service = pdfService(
    reports,
    wells,
    config.renderer ?? gotenbergRenderer(config.gotenbergUrl),
    config.pageOrigin,
  );
  return new Elysia({ name: 'pdf' }).use(guard).get(
    '/reports/:reportId/pdf',
    async ({ params, query, request }) => {
      const { bytes, fileName } = await service.render(
        params.reportId,
        query.page,
        sessionCookies(request.headers.get('cookie')),
        requestIdOf(request),
      );
      return new Response(bytes, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `attachment; filename="${fileName}"`,
          'cache-control': 'no-store',
        },
      });
    },
    { permission: 'report:read', params: reportParamsSchema, query: pdfQuerySchema },
  );
};
