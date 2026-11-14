"use client";

import { useEffect } from "react";
import { useUpdateProject } from "../hooks/use-project";
import { useProjectForm } from "../hooks/use-project-form";
import { type ProjectFormValues, toFormValues, toUpdatePayload } from "../lib/project-form";
import type { Project } from "../type";
import { ProjectFormSheet } from "./project-form-sheet";

type Props = {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectEditSheet({ project, open, onOpenChange }: Props) {
  const { mutateAsync: updateProject } = useUpdateProject();

  const form = useProjectForm(async (values: ProjectFormValues) => {
    try {
      await updateProject({ id: project.id, input: toUpdatePayload(values) });
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
      return false;
    }

    onOpenChange(false);
    return true;
  }, toFormValues(project));

  // Load the latest saved values every time the sheet opens (the project may have changed).
  useEffect(() => {
    if (open) form.reset(toFormValues(project));
  }, [open, project, form]);

  return (
    <ProjectFormSheet
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${project.name}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
    />
  );
}
