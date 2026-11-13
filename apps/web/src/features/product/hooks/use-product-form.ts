import { useForm } from "@tanstack/react-form";
import { defaultValues, type ProductFormValues, validate } from "../lib/product-form";

export type ProductFormApi = ReturnType<typeof useProductForm>;

/**
 * `submit` returns true when the product was saved; only then the form is reset.
 * A failed submit keeps what the user typed so they can retry.
 */
export function useProductForm(
  submit: (values: ProductFormValues) => Promise<boolean>,
  initialValues: ProductFormValues = defaultValues,
) {
  return useForm({
    defaultValues: initialValues,
    validators: { onChange: validate },
    onSubmit: async ({ value, formApi }) => {
      if (await submit(value)) formApi.reset();
    },
  });
}
