"use client";

import { useEffect } from "react";
import { useUpdateSection } from "../hooks/use-section";
import { useSectionForm } from "../hooks/use-section-form";
import { type SectionFormValues, toFormValues, toUpdatePayload } from "../lib/section-form";
import type { SectionListItem } from "../type";
import { SectionFormSheet } from "./section-form-sheet";

type Props = {
  section: SectionListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SectionEditSheet({ section, open, onOpenChange }: Props) {
  const { mutateAsync: updateSection } = useUpdateSection();

  // A section can't move to another well, so the select only shows its own well.
  const wellItems = [{ value: section.wellId, label: section.wellName }];

  const form = useSectionForm(async (values: SectionFormValues) => {
    try {
      await updateSection({ id: section.id, input: toUpdatePayload(values) });
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
      return false;
    }

    onOpenChange(false);
    return true;
  }, toFormValues(section));

  // Load the latest saved values every time the sheet opens (the section may have changed).
  useEffect(() => {
    if (open) form.reset(toFormValues(section));
  }, [open, section, form]);

  return (
    <SectionFormSheet
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${section.name}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      wellItems={wellItems}
      wellLocked
    />
  );
}
