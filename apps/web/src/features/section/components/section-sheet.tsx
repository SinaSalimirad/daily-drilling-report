"use client";

import { isAxiosError } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useWells } from "@/features/well/hooks/use-well";
import { useCreateSection } from "../hooks/use-section";
import { useSectionForm } from "../hooks/use-section-form";
import { type SectionFormValues, toPayload } from "../lib/section-form";
import { SectionFormSheet } from "./section-form-sheet";

export function SectionSheet() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: createSection } = useCreateSection();

  // The list is already cached by the Wells page; the select only needs id + name.
  const { data: wells = [] } = useWells();
  const wellItems = wells.map((well) => ({
    value: well.id,
    label: `${well.name} (${well.projectName})`,
  }));

  const form = useSectionForm(async (values: SectionFormValues) => {
    setSubmitError(null);

    try {
      await createSection(toPayload(values));
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "This well already has a section with this name or sequence."
          : "Could not add the section. Please try again.",
      );
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
        if (!next) {
          form.reset();
          setSubmitError(null);
        }
      }}
      title="Add New Section"
      submitLabel="Add Section"
      submittingLabel="Adding..."
      error={submitError}
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
