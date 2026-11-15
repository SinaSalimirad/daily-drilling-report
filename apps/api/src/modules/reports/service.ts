import type { Report, ReportCreate, ReportListQuery } from '@ddr/schemas';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import type { sectionsService } from '../sections/service';
import type { wellsService } from '../wells/service';
import type { ReportRow, reportsRepository } from './repository';

const toReport = (row: ReportRow): Report => ({
  id: row.id,
  wellId: row.wellId,
  sectionId: row.sectionId,
  reportNo: row.reportNo,
  reportDate: row.reportDate,
  status: row.status,
  revision: row.revision,
  submittedAt: row.submittedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** `YYYY-MM-DD` plus one calendar day, in UTC so a time zone never shifts the date. */
const nextDay = (date: string): string => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

export const reportsService = (
  repository: ReturnType<typeof reportsRepository>,
  wells: ReturnType<typeof wellsService>,
  sections: ReturnType<typeof sectionsService>,
) => {
  const get = async (reportId: string): Promise<Report> => {
    const row = await repository.findById(reportId);
    if (!row) throw new NotFoundError('Report not found');
    return toReport(row);
  };

  return {
    get,

    /** Newest first. 404 when the well does not exist. */
    async listByWell(wellId: string, { page, pageSize }: ReportListQuery) {
      await wells.get(wellId);
      const { rows, total } = await repository.listByWell(wellId, page, pageSize);
      return { data: rows.map(toReport), meta: { page, pageSize, total } };
    },

    /**
     * Number = previous + 1 and date = previous + 1 day; both can be overridden. The
     * first report takes number 1 and the spud date. A taken date is `REPORT_DATE_TAKEN`;
     * a taken number is rejected by the unique constraint (409).
     */
    async create(wellId: string, input: ReportCreate): Promise<Report> {
      const well = await wells.get(wellId);
      const section = await sections.get(input.sectionId);
      if (section.wellId !== wellId) {
        throw new ValidationError([
          { path: 'body.sectionId', message: 'The section belongs to another well' },
        ]);
      }

      const latest = await repository.findLatest(wellId);
      const reportNo = input.reportNo ?? (latest ? latest.reportNo + 1 : 1);
      const reportDate = input.reportDate ?? (latest ? nextDay(latest.reportDate) : well.spudDate);
      if (!reportDate) {
        throw new ValidationError([
          {
            path: 'body.reportDate',
            message: 'Send a report date, or set the spud date of the well',
          },
        ]);
      }

      if (await repository.findByDate(wellId, reportDate)) {
        throw new BusinessRuleError(
          'REPORT_DATE_TAKEN',
          'A report already exists for this well and date',
          { reportDate },
        );
      }
      return toReport(
        await repository.insert({ wellId, sectionId: section.id, reportNo, reportDate }),
      );
    },

    /** Only the newest report of the well, and only while it is a draft. */
    async remove(reportId: string): Promise<void> {
      const report = await get(reportId);
      const latest = await repository.findLatest(report.wellId);
      if (latest?.id !== report.id) {
        throw new BusinessRuleError(
          'REPORT_NOT_LATEST',
          'Only the newest report of the well can be deleted',
        );
      }
      if (report.status !== 'draft') {
        throw new ConflictError('A submitted report cannot be deleted');
      }
      await repository.delete(reportId);
    },
  };
};
