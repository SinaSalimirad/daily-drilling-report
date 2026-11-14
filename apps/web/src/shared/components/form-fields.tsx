import type { AnyFieldApi } from "@tanstack/react-form";
import { Asterisk, CalendarIcon } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  disabled?: boolean;
  /** Short hint shown under the input while there is no error. */
  description?: string;
  type?: "text" | "email" | "password";
  /** Autofill hint for the browser / password manager; off by default. */
  autoComplete?: string;
};

export function TextField({
  field,
  label,
  placeholder,
  numeric = false,
  required = false,
  disabled = false,
  description,
  type = "text",
  autoComplete = "off",
}: TextFieldProps) {
  const errors = errorsOf(field.state.meta);

  return (
    <Field className="min-w-0" data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name} className={disabled ? "text-muted-foreground" : undefined}>
        {label}
        {required && <RequiredMark />}
      </FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        disabled={disabled}
        value={field.state.value}
        onChange={(e) => {
          const next = e.target.value;
          if (numeric && !NUMERIC_PATTERN.test(next)) return;
          field.handleChange(next);
        }}
        onBlur={field.handleBlur}
        aria-invalid={errors.length > 0}
        className="h-10 disabled:border-dashed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        {...(numeric && { inputMode: "decimal" as const })}
      />
      {description && errors.length === 0 && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={errors} />
    </Field>
  );
}

type TextareaFieldProps = {
  field: AnyFieldApi;
  label: string;
  placeholder: string;
};

export function TextareaField({ field, label, placeholder }: TextareaFieldProps) {
  const errors = errorsOf(field.state.meta);

  return (
    <Field className="min-w-0" data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={errors.length > 0}
        placeholder={placeholder}
        rows={3}
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
  disabled?: boolean;
};

export function SelectField({
  field,
  label,
  placeholder,
  items,
  required = false,
  disabled = false,
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
        disabled={disabled}
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

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-03-01" -> local Date. Returns undefined for anything that is not a real date. */
function parseIsoDate(text: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

/** Local Date -> "YYYY-MM-DD". Built from local parts, so no timezone shift. */
const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

type DateFieldProps = {
  field: AnyFieldApi;
  label: string;
  placeholder: string;
  required?: boolean;
};

// The stored value is always "YYYY-MM-DD" (what the API expects), whatever the browser locale.
export function DateField({ field, label, placeholder, required = false }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const errors = errorsOf(field.state.meta);
  const value: string = field.state.value;
  const selected = value ? parseIsoDate(value) : undefined;

  return (
    <Field className="min-w-0" data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <RequiredMark />}
      </FieldLabel>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) field.handleBlur();
        }}
      >
        <PopoverTrigger
          render={
            <Button
              id={field.name}
              type="button"
              variant="outline"
              aria-invalid={errors.length > 0}
              // Same look as the Input and Select fields (the outline variant has no light background).
              className="h-10 w-full justify-between border-input! bg-input/20 px-2.5 font-normal hover:bg-input/30 dark:bg-input/30"
            />
          }
        >
          <span className={value ? "tabular-nums" : "text-muted-foreground"}>
            {value || placeholder}
          </span>
          <CalendarIcon className="size-4 text-muted-foreground" />
        </PopoverTrigger>
        {/* Same width as the button; the day cells are square, so a wider calendar means bigger days. */}
        <PopoverContent
          align="start"
          className="p-0"
          // Inline, so it always beats the popover's default w-72 whatever the CSS order is.
          style={{ width: "var(--anchor-width)" }}
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            className="w-full p-4"
            style={{ "--cell-size": "calc(var(--spacing) * 10)" } as CSSProperties}
            classNames={{ root: "w-full", week: "mt-1.5 flex w-full" }}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              field.handleChange(date ? toIsoDate(date) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <FieldError errors={errors} />
    </Field>
  );
}
