"use client";

import { isAxiosError } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateProject } from "../hooks/use-project";
import { useProjectForm } from "../hooks/use-project-form";
import { type ProjectFormValues, toPayload } from "../lib/project-form";
import { ProjectFormSheet } from "./project-form-sheet";

export function ProjectSheet() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: createProject } = useCreateProject();

  const form = useProjectForm(async (values: ProjectFormValues) => {
    setSubmitError(null);

    try {
      await createProject(toPayload(values));
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "A project with this name already exists."
          : "Could not add the project. Please try again.",
      );
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
        if (!next) {
          form.reset();
          setSubmitError(null);
        }
      }}
      title="Add New Project"
      submitLabel="Add Project"
      submittingLabel="Adding..."
      error={submitError}
      trigger={
        <>
          <Plus className="size-4" />
          Add Project
        </>
      }
    />
  );
}
