import type {
  Report,
  ReportCreate,
  ReportListQuery,
  ReportSubmit,
  ReportUpdate,
} from '@ddr/schemas';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  RevisionMismatchError,
  ValidationError,
} from '../../lib/errors';
import type { Warning } from '../../lib/response';
import type { sectionsService } from '../sections/service';
import type { wellsService } from '../wells/service';
import type { ReportRow, reportsRepository } from './repository';

/** TD today minus TD of the previous report; null while either is unknown. */
const drilled = (td: number | null, previousTd: number | null | undefined) =>
  td === null || previousTd === null || previousTd === undefined ? null : td - previousTd;

const toReport = (row: ReportRow, previousTd: number | null | undefined): Report => ({
  id: row.id,
  wellId: row.wellId,
  sectionId: row.sectionId,
  reportNo: row.reportNo,
  reportDate: row.reportDate,
  status: row.status,
  revision: row.revision,
  bitDepth: row.bitDepth,
  td: row.td,
  tvd: row.tvd,
  dailyDrilled: drilled(row.td, previousTd),
  representatives: row.representatives,
  engineers: row.engineers,
  drillingRemarks: row.drillingRemarks,
  fluidRemarks: row.fluidRemarks,
  formation: row.formation,
  submittedAt: row.submittedAt?.toISOString() ?? null,
  acknowledgedWarnings: row.acknowledgedWarnings,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** `YYYY-MM-DD` plus one calendar day, in UTC so a time zone never shifts the date. */
const nextDay = (date: string): string => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

/** Called once a report is created, with the report before it (carry-over of readings). */
export type AfterCreate = (report: Report, previous: Report | undefined) => Promise<void>;

export type CollectWarnings = (reportId: string) => Promise<Warning[]>;

export const reportsService = (
  repository: ReturnType<typeof reportsRepository>,
  wells: ReturnType<typeof wellsService>,
  sections: ReturnType<typeof sectionsService>,
  afterCreate?: AfterCreate,
  /** Warnings that are open on a report now (the collector of docs/05). */
  collectWarnings: CollectWarnings = async () => [],
) => {
  const present = async (row: ReportRow): Promise<Report> =>
    toReport(row, (await repository.findPrevious(row.wellId, row.reportNo))?.td);

  const get = async (reportId: string): Promise<Report> => {
    const row = await repository.findById(reportId);
    if (!row) throw new NotFoundError('Report not found');
    return present(row);
  };

  return {
    get,

    /** Newest first. 404 when the well does not exist. */
    async listByWell(wellId: string, { page, pageSize }: ReportListQuery) {
      await wells.get(wellId);
      const { rows, total } = await repository.listByWell(wellId, page, pageSize);
      // Newest first: the report below in the list is the previous one; only the last
      // row of the page needs a query.
      const last = rows[rows.length - 1];
      const beyond = last ? await repository.findPrevious(wellId, last.reportNo) : undefined;
      const data = rows.map((row, index) => toReport(row, (rows[index + 1] ?? beyond)?.td));
      return { data, meta: { page, pageSize, total } };
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
      const created = await present(
        await repository.insert({ wellId, sectionId: section.id, reportNo, reportDate }),
      );
      const previous = await repository.findPrevious(wellId, reportNo);
      await afterCreate?.(created, previous && (await present(previous)));
      return created;
    },

    /**
     * Header update. The request carries the revision it read; the write and the
     * revision bump are one statement, so two editors cannot both win (409).
     */
    async update(reportId: string, { revision, ...fields }: ReportUpdate): Promise<Report> {
      const current = await get(reportId);
      if (fields.sectionId) {
        const section = await sections.get(fields.sectionId);
        if (section.wellId !== current.wellId) {
          throw new ValidationError([
            { path: 'body.sectionId', message: 'The section belongs to another well' },
          ]);
        }
      }
      const row = await repository.updateAtRevision(reportId, revision, fields);
      if (!row) throw new RevisionMismatchError('This report was changed by someone else');
      return present(row);
    },

    /** The warnings open on the report now; every save of a report returns them. */
    warnings: (reportId: string) => collectWarnings(reportId),

    /**
     * Submits at the revision the client read. Open warnings need `acknowledgeWarnings`
     * (`WARNINGS_NOT_ACKNOWLEDGED` otherwise); their codes are stored on the report.
     */
    async submit(
      reportId: string,
      { revision, acknowledgeWarnings }: ReportSubmit,
    ): Promise<Report> {
      const current = await get(reportId);
      if (current.status === 'submitted') {
        throw new ConflictError('The report is already submitted');
      }
      const open = await collectWarnings(reportId);
      if (open.length > 0 && !acknowledgeWarnings) {
        throw new BusinessRuleError(
          'WARNINGS_NOT_ACKNOWLEDGED',
          'The report has open warnings; acknowledge them to submit',
          { warnings: open },
        );
      }
      const codes = [...new Set(open.map((warning) => warning.code))];
      const row = await repository.submitAtRevision(reportId, revision, codes);
      if (!row) throw new RevisionMismatchError('This report was changed by someone else');
      return present(row);
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
