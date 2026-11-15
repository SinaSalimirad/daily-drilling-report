'use client';

import { type ReportCreate, reportCreateSchema, type Section } from '@ddr/schemas';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormField } from '@/components/FormField';
import { NativeSelect } from '@/components/NativeSelect';
import { useUnitSystem } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-error';
import {
  type FieldErrors,
  focusFirstError,
  issuesToFieldErrors,
  serverFieldErrors,
  toastError,
} from '@/lib/form-errors';
import { formatQuantity } from '@/lib/format';
import { proposeNext } from './proposal';
import { useCreateReport, useLatestReport } from './use-reports';

/**
 * "New report": shows the number and date the API would give (both editable), the section
 * of the previous report as the default. Creating a report opens its editor.
 */
export function NewReportDialog({
  wellId,
  spudDate,
  sections,
}: {
  wellId: string;
  spudDate: string | null;
  sections: Section[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={sections.length === 0} />}>New report</DialogTrigger>
      <DialogContent>
        {/* Mounted only while open, so the proposal is read fresh each time. */}
        {open ? <NewReportForm wellId={wellId} spudDate={spudDate} sections={sections} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function NewReportForm({
  wellId,
  spudDate,
  sections,
}: {
  wellId: string;
  spudDate: string | null;
  sections: Section[];
}) {
  const latest = useLatestReport(wellId);
  if (latest.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (latest.isError) return <p className="text-destructive text-sm">{latest.error.message}</p>;
  return (
    <Fields
      wellId={wellId}
      sections={sections}
      proposal={proposeNext(latest.data, spudDate)}
      defaultSectionId={latest.data?.sectionId ?? sections[sections.length - 1]?.id ?? ''}
    />
  );
}

function Fields({
  wellId,
  sections,
  proposal,
  defaultSectionId,
}: {
  wellId: string;
  sections: Section[];
  proposal: { reportNo: number; reportDate: string };
  defaultSectionId: string;
}) {
  const router = useRouter();
  const system = useUnitSystem();
  const create = useCreateReport(wellId);
  const [sectionId, setSectionId] = useState(defaultSectionId);
  const [reportNo, setReportNo] = useState(String(proposal.reportNo));
  const [reportDate, setReportDate] = useState(proposal.reportDate);
  const [errors, setErrors] = useState<FieldErrors>({});

  const show = (next: FieldErrors) => {
    setErrors(next);
    focusFirstError(next);
  };

  const submit = async () => {
    const candidate: ReportCreate = {
      sectionId,
      reportNo: Number(reportNo),
      reportDate: reportDate === '' ? undefined : reportDate,
    };
    const parsed = reportCreateSchema.safeParse(candidate);
    if (!parsed.success) return show(issuesToFieldErrors(parsed.error.issues));
    try {
      const report = await create.mutateAsync(parsed.data);
      router.push(`/reports/${report.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'REPORT_DATE_TAKEN') {
        return show({ reportDate: 'A report already exists for this date' });
      }
      const fieldErrors = serverFieldErrors(error, {
        daily_reports_well_id_report_no_unique: {
          field: 'reportNo',
          message: 'A report with this number already exists',
        },
        daily_reports_well_id_report_date_unique: {
          field: 'reportDate',
          message: 'A report already exists for this date',
        },
      });
      if (fieldErrors) show(fieldErrors);
      else toastError(error);
    }
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>New report</DialogTitle>
        <DialogDescription>
          The number and date follow the previous report; change them if needed.
        </DialogDescription>
      </DialogHeader>
      <FormField id="reportNo" label="Report number" error={errors.reportNo}>
        <Input
          id="reportNo"
          inputMode="numeric"
          aria-invalid={Boolean(errors.reportNo)}
          value={reportNo}
          onChange={(e) => setReportNo(e.target.value)}
        />
      </FormField>
      <FormField
        id="reportDate"
        label="Report date"
        error={errors.reportDate}
        hint={proposal.reportDate === '' ? 'The well has no spud date: enter the date.' : undefined}
      >
        <Input
          id="reportDate"
          type="date"
          aria-invalid={Boolean(errors.reportDate)}
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
        />
      </FormField>
      <FormField id="sectionId" label="Section" error={errors.sectionId}>
        <NativeSelect
          id="sectionId"
          aria-invalid={Boolean(errors.sectionId)}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.sortOrder}. {formatQuantity(section.holeSize, 'diameter', system)} hole
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create report'}
        </Button>
      </DialogFooter>
    </form>
  );
}
