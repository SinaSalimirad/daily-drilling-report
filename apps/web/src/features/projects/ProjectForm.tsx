'use client';

import { UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import {
  type Project,
  type ProjectCreate,
  projectCreateSchema,
  type UnitSystem,
} from '@ddr/schemas';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  type FieldErrors,
  focusFirstError,
  issuesToFieldErrors,
  serverFieldErrors,
  toastError,
} from '@/lib/form-errors';
import { UnitSystemFields } from './UnitSystemFields';

const TEXT_FIELDS = [
  { name: 'name', label: 'Project name *' },
  { name: 'operator', label: 'Operator *' },
  { name: 'contractor', label: 'Contractor' },
  { name: 'rigName', label: 'Rig' },
  { name: 'fieldCountry', label: 'Field / country' },
  { name: 'currency', label: 'Currency *', hint: 'Printed in cost labels, e.g. $, €, IRR' },
] as const;

type TextField = (typeof TEXT_FIELDS)[number]['name'];
type Values = Record<TextField, string> & { unitSystem: UnitSystem };

const CONFLICTS = {
  projects_name_unique: { field: 'name', message: 'A project with this name already exists' },
};

function toPayload(values: Values): ProjectCreate {
  const optional = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    name: values.name.trim(),
    operator: values.operator.trim(),
    contractor: optional(values.contractor),
    rigName: optional(values.rigName),
    fieldCountry: optional(values.fieldCountry),
    currency: values.currency.trim(),
    unitSystem: values.unitSystem,
  };
}

/** Create and edit form of a project (TanStack Form + the shared zod schema). */
export function ProjectForm({
  project,
  submitLabel,
  onSubmit,
}: {
  project?: Project;
  submitLabel: string;
  onSubmit: (payload: ProjectCreate) => Promise<unknown>;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const showErrors = (next: FieldErrors) => {
    setErrors(next);
    focusFirstError(next);
  };

  const defaultValues: Values = {
    name: project?.name ?? '',
    operator: project?.operator ?? '',
    contractor: project?.contractor ?? '',
    rigName: project?.rigName ?? '',
    fieldCountry: project?.fieldCountry ?? '',
    currency: project?.currency ?? '',
    unitSystem: project?.unitSystem ?? { ...UNIT_SYSTEM_PRESETS.si },
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const parsed = projectCreateSchema.safeParse(toPayload(value));
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

  const clearErrors = (match: (field: string) => boolean) =>
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([field]) => !match(field))),
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
        {TEXT_FIELDS.map((f) => (
          <form.Field key={f.name} name={f.name}>
            {(field) => (
              <FormField
                id={f.name}
                label={f.label}
                error={errors[f.name]}
                hint={'hint' in f ? f.hint : undefined}
              >
                <Input
                  id={f.name}
                  name={f.name}
                  aria-invalid={Boolean(errors[f.name])}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearErrors((name) => name === f.name);
                  }}
                />
              </FormField>
            )}
          </form.Field>
        ))}
      </div>
      <form.Field name="unitSystem">
        {(field) => (
          <UnitSystemFields
            value={field.state.value}
            errors={errors}
            onChange={(next) => {
              field.handleChange(next);
              clearErrors((name) => name.startsWith('unitSystem'));
            }}
          />
        )}
      </form.Field>
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
