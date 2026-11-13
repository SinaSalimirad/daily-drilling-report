import type { AnyFieldApi } from "@tanstack/react-form";
import { Asterisk } from "lucide-react";
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

// Muted asterisk marking required fields; screen readers get the word instead.
function RequiredMark() {
  return (
    <>
      <Asterisk aria-hidden className="text-muted-foreground size-3.5" />
      <span className="sr-only">(required)</span>
    </>
  );
}

// Digits with an optional single decimal point; anything else is rejected, including pasted text.
const NUMERIC_PATTERN = /^\d*\.?\d*$/;

type TextFieldProps = {
  field: AnyFieldApi;
  label: string;
  placeholder: string;
  numeric?: boolean;
  required?: boolean;
};

export function TextField({
  field,
  label,
  placeholder,
  numeric = false,
  required = false,
}: TextFieldProps) {
  const errors = errorsOf(field.state.meta);

  return (
    <Field className="min-w-0" data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <RequiredMark />}
      </FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(e) => {
          const next = e.target.value;
          if (numeric && !NUMERIC_PATTERN.test(next)) return;
          field.handleChange(next);
        }}
        onBlur={field.handleBlur}
        aria-invalid={errors.length > 0}
        className="h-10"
        autoComplete="off"
        placeholder={placeholder}
        {...(numeric && { inputMode: "decimal" as const })}
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
  required?: boolean;
};

export function SelectField({
  field,
  label,
  placeholder,
  items,
  required = false,
}: SelectFieldProps) {
  const errors = errorsOf(field.state.meta);

  return (
    <Field className="min-w-0" data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <RequiredMark />}
      </FieldLabel>
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
