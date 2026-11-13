"use client";

import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: updateProject } = useUpdateProject();

  const form = useProjectForm(async (values: ProjectFormValues) => {
    setSubmitError(null);

    try {
      await updateProject({ id: project.id, input: toUpdatePayload(values) });
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "A project with this name already exists."
          : "Could not save the project. Please try again.",
      );
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
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSubmitError(null);
      }}
      title={`Edit ${project.name}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      error={submitError}
    />
  );
}
