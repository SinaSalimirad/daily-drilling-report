"use client";

import { useEffect } from "react";
import { useUpdateWell } from "../hooks/use-well";
import { useWellForm } from "../hooks/use-well-form";
import { toFormValues, toUpdatePayload, type WellFormValues } from "../lib/well-form";
import type { WellListItem } from "../type";
import { WellFormSheet } from "./well-form-sheet";

type Props = {
  well: WellListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WellEditSheet({ well, open, onOpenChange }: Props) {
  const { mutateAsync: updateWell } = useUpdateWell();

  // A well can't move to another project, so the select only shows its own project.
  const projectItems = [{ value: well.projectId, label: well.projectName }];

  const form = useWellForm(async (values: WellFormValues) => {
    try {
      await updateWell({ id: well.id, input: toUpdatePayload(values) });
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
      return false;
    }

    onOpenChange(false);
    return true;
  }, toFormValues(well));

  // Load the latest saved values every time the sheet opens (the well may have changed).
  useEffect(() => {
    if (open) form.reset(toFormValues(well));
  }, [open, well, form]);

  return (
    <WellFormSheet
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${well.name}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      projectItems={projectItems}
      projectLocked
    />
  );
}
