import { useForm } from "@tanstack/react-form";
import { defaultValues, validate, type WellFormValues } from "../lib/well-form";

export type WellFormApi = ReturnType<typeof useWellForm>;

/**
 * `submit` returns true when the well was saved; only then the form is reset.
 * A failed submit keeps what the user typed so they can retry.
 */
export function useWellForm(
  submit: (values: WellFormValues) => Promise<boolean>,
  initialValues: WellFormValues = defaultValues,
) {
  return useForm({
    defaultValues: initialValues,
    validators: { onChange: validate },
    onSubmit: async ({ value, formApi }) => {
      if (await submit(value)) formApi.reset();
    },
  });
}
