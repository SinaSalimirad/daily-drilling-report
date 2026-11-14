"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useWells } from "@/features/well/hooks/use-well";
import { useCreateSection } from "../hooks/use-section";
import { useSectionForm } from "../hooks/use-section-form";
import { type SectionFormValues, toPayload } from "../lib/section-form";
import { SectionFormSheet } from "./section-form-sheet";

export function SectionSheet() {
  const [open, setOpen] = useState(false);
  const { mutateAsync: createSection } = useCreateSection();

  // The list is already cached by the Wells page; the select only needs id + name.
  const { data: wells = [] } = useWells();
  const wellItems = wells.map((well) => ({
    value: well.id,
    label: `${well.name} (${well.projectName})`,
  }));

  const form = useSectionForm(async (values: SectionFormValues) => {
    try {
      await createSection(toPayload(values));
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
      return false;
    }

    setOpen(false);
    return true;
  });

  return (
    <SectionFormSheet
      form={form}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
      title="Add New Section"
      submitLabel="Add Section"
      submittingLabel="Adding..."
      wellItems={wellItems}
      trigger={
        <>
          <Plus className="size-4" />
          Add Section
        </>
      }
    />
  );
}
