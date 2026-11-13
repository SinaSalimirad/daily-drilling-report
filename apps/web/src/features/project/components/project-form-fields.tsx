import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { SelectField, TextField } from "@/shared/components/form-fields";
import { CURRENCY_ITEMS, RIG_TYPE_ITEMS } from "../constants";
import type { ProjectFormApi } from "../hooks/use-project-form";

const sectionGridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2";
const namesHint = "Up to 2 names, separated by a comma";

export function ProjectFormFields({ form }: { form: ProjectFormApi }) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_auto_1fr]">
      <FieldSet className="min-w-0">
        <FieldLegend>General Information</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                required
                label="Project Name"
                placeholder="e.g. Azadegan 2"
              />
            )}
          </form.Field>
          <form.Field name="field">
            {(field) => (
              <TextField field={field} required label="Field" placeholder="e.g. Azadegan" />
            )}
          </form.Field>
          <form.Field name="operators">
            {(field) => (
              <TextField
                field={field}
                required
                label="Operators"
                placeholder="e.g. NIOC, Total"
                description={namesHint}
              />
            )}
          </form.Field>
          <form.Field name="contractors">
            {(field) => (
              <TextField
                field={field}
                required
                label="Contractors"
                placeholder="e.g. NIDC"
                description={namesHint}
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      {/* Horizontal when the sections are stacked, vertical when they sit side by side. */}
      <Separator className="xl:hidden" />
      <Separator orientation="vertical" className="hidden xl:block" />

      <FieldSet className="min-w-0">
        <FieldLegend>Rig &amp; Pricing</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <div className="sm:col-span-2">
            <form.Field name="rigName">
              {(field) => (
                <TextField field={field} required label="Rig Name" placeholder="e.g. NDC-110" />
              )}
            </form.Field>
          </div>
          <form.Field name="rigType">
            {(field) => (
              <SelectField
                field={field}
                required
                label="Rig Type"
                placeholder="Select rig type"
                items={RIG_TYPE_ITEMS}
              />
            )}
          </form.Field>
          <form.Field name="currencyCode">
            {(field) => (
              <SelectField
                field={field}
                required
                label="Currency"
                placeholder="Select currency"
                items={CURRENCY_ITEMS}
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
