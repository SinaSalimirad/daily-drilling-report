import { FieldGroup, FieldSet } from "@/components/ui/field";
import { SelectField, TextField } from "@/shared/components/form-fields";
import type { SectionFormApi } from "../hooks/use-section-form";

type Props = {
  form: SectionFormApi;
  wellItems: ReadonlyArray<{ value: string; label: string }>;
  wellLocked: boolean;
};

export function SectionFormFields({ form, wellItems, wellLocked }: Props) {
  return (
    <FieldSet className="min-w-0 max-w-2xl">
      <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <form.Field name="wellId">
            {(field) => (
              <SelectField
                field={field}
                required
                disabled={wellLocked}
                label="Well"
                placeholder={wellItems.length === 0 ? "No wells yet" : "Select well"}
                items={wellItems}
              />
            )}
          </form.Field>
        </div>
        <form.Field name="name">
          {(field) => (
            <TextField
              field={field}
              required
              label="Section Name"
              placeholder='e.g. 12 1/4" hole'
            />
          )}
        </form.Field>
        <form.Field name="sequence">
          {(field) => (
            <TextField
              field={field}
              required
              numeric
              label="Sequence"
              placeholder="e.g. 1"
              description="Order of the section within the well"
            />
          )}
        </form.Field>
      </FieldGroup>
    </FieldSet>
  );
}
