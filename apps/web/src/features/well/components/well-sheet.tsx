"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useProjects } from "@/features/project/hooks/use-project";
import { useCreateWell } from "../hooks/use-well";
import { useWellForm } from "../hooks/use-well-form";
import { toPayload, type WellFormValues } from "../lib/well-form";
import { WellFormSheet } from "./well-form-sheet";

export function WellSheet() {
  const [open, setOpen] = useState(false);
  const { mutateAsync: createWell } = useCreateWell();

  // The list is already cached by the Projects page; the select only needs id + name.
  const { data: projects = [] } = useProjects();
  const projectItems = projects.map((project) => ({ value: project.id, label: project.name }));

  const form = useWellForm(async (values: WellFormValues) => {
    try {
      await createWell(toPayload(values));
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
      return false;
    }

    setOpen(false);
    return true;
  });

  return (
    <WellFormSheet
      form={form}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
      title="Add New Well"
      submitLabel="Add Well"
      submittingLabel="Adding..."
      projectItems={projectItems}
      trigger={
        <>
          <Plus className="size-4" />
          Add Well
        </>
      }
    />
  );
}
