import { useForm } from "@tanstack/react-form";
import { defaultValues, type SectionFormValues, validate } from "../lib/section-form";

export type SectionFormApi = ReturnType<typeof useSectionForm>;

/**
 * `submit` returns true when the section was saved; only then the form is reset.
 * A failed submit keeps what the user typed so they can retry.
 */
export function useSectionForm(
  submit: (values: SectionFormValues) => Promise<boolean>,
  initialValues: SectionFormValues = defaultValues,
) {
  return useForm({
    defaultValues: initialValues,
    validators: { onChange: validate },
    onSubmit: async ({ value, formApi }) => {
      if (await submit(value)) formApi.reset();
    },
  });
}
