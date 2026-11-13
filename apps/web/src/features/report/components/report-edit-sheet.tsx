"use client";

import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { useSections } from "@/features/section/hooks/use-section";
import { useUpdateReport } from "../hooks/use-report";
import { useReportForm } from "../hooks/use-report-form";
import { type ReportFormValues, toFormValues, toUpdatePayload } from "../lib/report-form";
import type { ReportListItem } from "../type";
import { ReportFormSheet } from "./report-form-sheet";

type Props = {
  report: ReportListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportEditSheet({ report, open, onOpenChange }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: updateReport } = useUpdateReport();

  // A report can't move to another well, so the select only shows its own well.
  const wellItems = [{ value: report.wellId, label: report.wellName }];

  // The section can change, but only to another section of the same well.
  const { data: sections = [] } = useSections();
  const sectionItems = sections.map((section) => ({
    value: section.id,
    label: section.name,
    wellId: section.wellId,
  }));

  const form = useReportForm(async (values: ReportFormValues) => {
    setSubmitError(null);

    try {
      await updateReport({ id: report.id, input: toUpdatePayload(values) });
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "This well already has a report with this number or date."
          : "Could not save the report. Please try again.",
      );
      return false;
    }

    onOpenChange(false);
    return true;
  }, toFormValues(report));

  // Load the latest saved values every time the sheet opens (the report may have changed).
  useEffect(() => {
    if (open) form.reset(toFormValues(report));
  }, [open, report, form]);

  return (
    <ReportFormSheet
      form={form}
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSubmitError(null);
      }}
      title={`Edit report #${report.reportNumber}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      error={submitError}
      wellItems={wellItems}
      sectionItems={sectionItems}
      wellLocked
    />
  );
}
