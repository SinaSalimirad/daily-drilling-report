import type { AnyFieldApi } from "@tanstack/react-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Show errors only after the user touched the field, so an empty form is not red.
function errorsOf(meta: AnyFieldApi["state"]["meta"]) {
  return meta.isTouched ? meta.errors.filter(Boolean).map((e) => ({ message: String(e) })) : [];
}

type TextFieldProps = {
  field: AnyFieldApi;
  label: string;
  placeholder: string;
  numeric?: boolean;
};

export function TextField({ field, label, placeholder, numeric = false }: TextFieldProps) {
  const errors = errorsOf(field.state.meta);

  return (
    <Field className="min-w-0" data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={errors.length > 0}
        className="h-10"
        autoComplete="off"
        placeholder={placeholder}
        {...(numeric && { type: "number", min: 0, step: "any", inputMode: "decimal" as const })}
      />
      <FieldError errors={errors} />
    </Field>
  );
}

type SelectFieldProps = {
  field: AnyFieldApi;
  label: string;
  placeholder: string;
  items: ReadonlyArray<{ value: string; label: string }>;
};

export function SelectField({ field, label, placeholder, items }: SelectFieldProps) {
  const errors = errorsOf(field.state.meta);

  return (
    <Field className="min-w-0" data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        name={field.name}
        items={items}
        value={field.state.value || null}
        onValueChange={(value) => {
          field.handleChange(value ?? "");
          field.handleBlur();
        }}
      >
        <SelectTrigger id={field.name} className="h-10 w-full" aria-invalid={errors.length > 0}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError errors={errors} />
    </Field>
  );
}
