import { useForm } from "@tanstack/react-form";
import { defaultValues, type InventoryFormValues, validate } from "../lib/inventory-form";

export type InventoryFormApi = ReturnType<typeof useInventoryForm>;

/**
 * `submit` returns true when the inventory was saved; only then the form is reset.
 * A failed submit keeps what the user typed so they can retry.
 */
export function useInventoryForm(
  submit: (values: InventoryFormValues) => Promise<boolean>,
  initialValues: InventoryFormValues = defaultValues,
) {
  return useForm({
    defaultValues: initialValues,
    validators: { onChange: validate },
    onSubmit: async ({ value, formApi }) => {
      if (await submit(value)) formApi.reset();
    },
  });
}
