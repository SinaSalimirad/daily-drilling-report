"use client";

import { isAxiosError } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useSections } from "@/features/section/hooks/use-section";
import { useWells } from "@/features/well/hooks/use-well";
import { useCreateReport } from "../hooks/use-report";
import { useReportForm } from "../hooks/use-report-form";
import { type ReportFormValues, toPayload } from "../lib/report-form";
import { ReportFormSheet } from "./report-form-sheet";

export function ReportSheet() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: createReport } = useCreateReport();

  // Both lists are already cached by the Wells and Sections pages.
  const { data: wells = [] } = useWells();
  const { data: sections = [] } = useSections();
  // Well names are only unique inside a project, so the project is part of the label.
  const wellItems = wells.map((well) => ({
    value: well.id,
    label: `${well.name} (${well.projectName})`,
  }));
  const sectionItems = sections.map((section) => ({
    value: section.id,
    label: section.name,
    wellId: section.wellId,
  }));

  const form = useReportForm(async (values: ReportFormValues) => {
    setSubmitError(null);

    try {
      await createReport(toPayload(values));
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "This well already has a report with this number or date."
          : "Could not add the report. Please try again.",
      );
      return false;
    }

    setOpen(false);
    return true;
  });

  return (
    <ReportFormSheet
      form={form}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setSubmitError(null);
        }
      }}
      title="Add New Report"
      submitLabel="Add Report"
      submittingLabel="Adding..."
      error={submitError}
      wellItems={wellItems}
      sectionItems={sectionItems}
      trigger={
        <>
          <Plus className="size-4" />
          Add Report
        </>
      }
    />
  );
}
