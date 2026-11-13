"use client";

import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: updateWell } = useUpdateWell();

  // A well can't move to another project, so the select only shows its own project.
  const projectItems = [{ value: well.projectId, label: well.projectName }];

  const form = useWellForm(async (values: WellFormValues) => {
    setSubmitError(null);

    try {
      await updateWell({ id: well.id, input: toUpdatePayload(values) });
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "A well with this name already exists in this project."
          : "Could not save the well. Please try again.",
      );
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
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSubmitError(null);
      }}
      title={`Edit ${well.name}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      error={submitError}
      projectItems={projectItems}
      projectLocked
    />
  );
}
