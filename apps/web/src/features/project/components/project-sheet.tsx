"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateProject } from "../hooks/use-project";
import { useProjectForm } from "../hooks/use-project-form";
import { type ProjectFormValues, toPayload } from "../lib/project-form";
import { ProjectFormSheet } from "./project-form-sheet";

export function ProjectSheet() {
  const [open, setOpen] = useState(false);
  const { mutateAsync: createProject } = useCreateProject();

  const form = useProjectForm(async (values: ProjectFormValues) => {
    try {
      await createProject(toPayload(values));
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
      return false;
    }

    setOpen(false);
    return true;
  });

  return (
    <ProjectFormSheet
      form={form}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
      title="Add New Project"
      submitLabel="Add Project"
      submittingLabel="Adding..."
      trigger={
        <>
          <Plus className="size-4" />
          Add Project
        </>
      }
    />
  );
}
