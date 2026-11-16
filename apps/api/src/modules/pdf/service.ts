import type { PdfPage } from '@ddr/schemas';
import type { reportsService } from '../reports/service';
import type { wellsService } from '../wells/service';
import type { PdfRenderer } from './gotenberg';

const PATHS: Record<PdfPage, (reportId: string) => string> = {
  report: (id) => `/reports/${id}/print`,
  inventory: (id) => `/reports/${id}/inventory/print`,
};

/** `PYW-24 ST1` → `PYW-24-ST1`: safe in a file name and a header. */
const fileSafe = (name: string) =>
  name
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'well';

/** Only the session cookies of better-auth go to the renderer, nothing else the browser sent. */
export function sessionCookies(header: string | null): string {
  return (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => /^(__Secure-)?better-auth\./.test(part))
    .join('; ');
}

export const pdfService = (
  reports: ReturnType<typeof reportsService>,
  wells: ReturnType<typeof wellsService>,
  render: PdfRenderer,
  pageOrigin: string,
) => ({
  /** 404 for an unknown report before anything is rendered. */
  async render(reportId: string, page: PdfPage, cookie: string, requestId: string) {
    const report = await reports.get(reportId);
    const well = await wells.get(report.wellId);
    const bytes = await render({
      url: new URL(PATHS[page](reportId), pageOrigin).toString(),
      cookie,
      requestId,
    });
    return { bytes, fileName: `${fileSafe(well.name)}-${page}-${report.reportNo}.pdf` };
  },
});
