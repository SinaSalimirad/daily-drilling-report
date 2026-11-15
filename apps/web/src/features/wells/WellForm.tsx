'use client';

import {
  RIG_TYPES,
  WELL_DESIGNATIONS,
  WELL_TYPES,
  type Well,
  type WellCreate,
  wellCreateSchema,
} from '@ddr/schemas';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { FormField } from '@/components/FormField';
import { NativeSelect } from '@/components/NativeSelect';
import { QuantityInput } from '@/components/QuantityInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  type FieldErrors,
  focusFirstError,
  issuesToFieldErrors,
  serverFieldErrors,
  toastError,
} from '@/lib/form-errors';
import { enumLabel } from '@/lib/labels';

type Values = {
  name: string;
  designation: string;
  wellType: string;
  rigType: string;
  spudDate: string;
  waterDepth: number | null;
};

const CONFLICTS = {
  wells_project_id_name_unique: {
    field: 'name',
    message: 'A well with this name already exists in this project',
  },
};

function toPayload(values: Values) {
  return {
    name: values.name.trim(),
    designation: values.designation === '' ? null : values.designation,
    wellType: values.wellType,
    rigType: values.rigType,
    spudDate: values.spudDate === '' ? null : values.spudDate,
    waterDepth: values.waterDepth,
  };
}

/** Create and edit form of a well. Water depth is typed in the project's display unit. */
export function WellForm({
  well,
  submitLabel,
  onSubmit,
}: {
  well?: Well;
  submitLabel: string;
  onSubmit: (payload: WellCreate) => Promise<unknown>;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const showErrors = (next: FieldErrors) => {
    setErrors(next);
    focusFirstError(next);
  };
  const clearError = (name: string) =>
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([k]) => k !== name)));

  const defaultValues: Values = {
    name: well?.name ?? '',
    designation: well?.designation ?? '',
    wellType: well?.wellType ?? 'vertical',
    rigType: well?.rigType ?? 'onshore',
    spudDate: well?.spudDate ?? '',
    waterDepth: well?.waterDepth ?? null,
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const parsed = wellCreateSchema.safeParse(toPayload(value));
      if (!parsed.success) return showErrors(issuesToFieldErrors(parsed.error.issues));
      setErrors({});
      try {
        await onSubmit(parsed.data);
      } catch (error) {
        const fieldErrors = serverFieldErrors(error, CONFLICTS);
        if (fieldErrors) showErrors(fieldErrors);
        else toastError(error);
      }
    },
  });

  const selectField = (
    name: 'designation' | 'wellType' | 'rigType',
    label: string,
    options: readonly string[],
    optional = false,
  ) => (
    <form.Field name={name}>
      {(field) => (
        <FormField id={name} label={label} error={errors[name]}>
          <NativeSelect
            id={name}
            aria-invalid={Boolean(errors[name])}
            value={field.state.value}
            onChange={(e) => {
              field.handleChange(e.target.value);
              clearError(name);
            }}
          >
            {optional ? <option value="">—</option> : null}
            {options.map((option) => (
              <option key={option} value={option}>
                {enumLabel(option)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      )}
    </form.Field>
  );

  return (
    <form
      noValidate
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="name">
          {(field) => (
            <FormField id="name" label="Well name *" error={errors.name}>
              <Input
                id="name"
                aria-invalid={Boolean(errors.name)}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  clearError('name');
                }}
              />
            </FormField>
          )}
        </form.Field>
        {selectField('designation', 'Designation', WELL_DESIGNATIONS, true)}
        {selectField('wellType', 'Well type *', WELL_TYPES)}
        {selectField('rigType', 'Rig type *', RIG_TYPES)}
        <form.Field name="spudDate">
          {(field) => (
            <FormField id="spudDate" label="Spud date" error={errors.spudDate}>
              <Input
                id="spudDate"
                type="date"
                aria-invalid={Boolean(errors.spudDate)}
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  clearError('spudDate');
                }}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="waterDepth">
          {(field) => (
            <FormField
              id="waterDepth"
              label="Water depth"
              error={errors.waterDepth}
              hint="Offshore wells"
            >
              <QuantityInput
                id="waterDepth"
                quantity="depth"
                aria-invalid={Boolean(errors.waterDepth)}
                value={field.state.value}
                onChange={(si) => {
                  field.handleChange(si);
                  clearError('waterDepth');
                }}
              />
            </FormField>
          )}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
