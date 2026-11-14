"use client";

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
    try {
      await createReport(toPayload(values));
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
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
        if (!next) form.reset();
      }}
      title="Add New Report"
      submitLabel="Add Report"
      submittingLabel="Adding..."
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
