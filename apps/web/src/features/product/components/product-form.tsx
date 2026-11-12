import { useForm } from "@tanstack/react-form";
import type { CreateProductInput } from "../type";

export function ProductForm() {
  const defaultValues: CreateProductInput = {
    name: "",
    size: 0,
    unit: "bbl",
    specificGravity: "",
    origin: "local",
  };

  const form = useForm({
    defaultValues,
    onSubmit: async () => {},
  });

  return (
    <form
      onSubmit={() => {
        form.handleSubmit();
      }}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => (value ? undefined : "Required"),
        }}
      >
        {(field) => (
          <input
            placeholder="Well name"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <form.Field
        name="size"
        validators={{
          onChange: ({ value }) => (value ? undefined : "Required"),
        }}
      >
        {(field) => (
          <input
            type="number"
            min={0}
            placeholder="Product Size"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(Number(e.target.value))}
          />
        )}
      </form.Field>

      {/* TODO: Complete the form with claude code 
            prompt: 
                see the backend schema (product schema and z.createSchema) then 
                complete this form
      */}
    </form>
  );
}
