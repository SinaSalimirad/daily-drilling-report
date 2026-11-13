import { useForm } from "@tanstack/react-form";
import { defaultValues, type ProjectFormValues, validate } from "../lib/project-form";

export type ProjectFormApi = ReturnType<typeof useProjectForm>;

/**
 * `submit` returns true when the project was saved; only then the form is reset.
 * A failed submit keeps what the user typed so they can retry.
 */
export function useProjectForm(
  submit: (values: ProjectFormValues) => Promise<boolean>,
  initialValues: ProjectFormValues = defaultValues,
) {
  return useForm({
    defaultValues: initialValues,
    validators: { onChange: validate },
    onSubmit: async ({ value, formApi }) => {
      if (await submit(value)) formApi.reset();
    },
  });
}
