'use client';

import type { Report } from '@ddr/schemas';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { ApiError } from '@/lib/api-error';
import { toastError } from '@/lib/form-errors';
import { useSubmitReport } from './use-reports';
import type { ReportWarning } from './WarningsPanel';

/**
 * Submit: lists the open warnings; with any, the submit button stays off until the
 * acknowledge box is ticked (the API refuses otherwise: WARNINGS_NOT_ACKNOWLEDGED).
 */
export function SubmitDialog({
  report,
  warnings,
  onConflict,
}: {
  report: Report;
  warnings: ReportWarning[];
  onConflict: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const submit = useSubmitReport(report.id);
  const blocked = warnings.length > 0 && !acknowledged;

  const send = async () => {
    try {
      await submit.mutateAsync({ revision: report.revision, acknowledgeWarnings: acknowledged });
      setOpen(false);
      toast.success('Report submitted');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'REVISION_MISMATCH') {
        setOpen(false);
        onConflict();
      } else toastError(error);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAcknowledged(false);
      }}
    >
      <DialogTrigger render={<Button disabled={report.status === 'submitted'} />}>
        Submit report
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit report {report.reportNo}</DialogTitle>
          <DialogDescription>
            A submitted report can still be edited; every edit is recorded.
          </DialogDescription>
        </DialogHeader>
        {warnings.length > 0 ? (
          <div className="flex flex-col gap-3">
            <ul className="list-disc pl-5 text-sm">
              {warnings.map((warning) => (
                <li key={`${warning.code}:${warning.message}`}>{warning.message}</li>
              ))}
            </ul>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I have read the warnings and want to submit anyway.
            </label>
          </div>
        ) : (
          <p className="text-sm">There are no open warnings.</p>
        )}
        <DialogFooter>
          <Button type="button" disabled={blocked || submit.isPending} onClick={send}>
            {submit.isPending ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
