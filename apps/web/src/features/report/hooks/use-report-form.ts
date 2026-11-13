import { useForm } from "@tanstack/react-form";
import { defaultValues, type ReportFormValues, validate } from "../lib/report-form";

export type ReportFormApi = ReturnType<typeof useReportForm>;

/**
 * `submit` returns true when the report was saved; only then the form is reset.
 * A failed submit keeps what the user typed so they can retry.
 */
export function useReportForm(
  submit: (values: ReportFormValues) => Promise<boolean>,
  initialValues: ReportFormValues = defaultValues,
) {
  return useForm({
    defaultValues: initialValues,
    validators: { onChange: validate },
    onSubmit: async ({ value, formApi }) => {
      if (await submit(value)) formApi.reset();
    },
  });
}
