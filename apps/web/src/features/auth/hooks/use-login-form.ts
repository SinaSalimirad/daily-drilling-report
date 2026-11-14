import { useForm } from "@tanstack/react-form";
import { defaultValues, type LoginFormValues, validate } from "../lib/login-form";

export type LoginFormApi = ReturnType<typeof useLoginForm>;

// No reset after success: the page navigates away, and a reset would flash an empty form.
export function useLoginForm(submit: (values: LoginFormValues) => Promise<void>) {
  return useForm({
    defaultValues,
    validators: { onChange: validate },
    onSubmit: ({ value }) => submit(value),
  });
}
