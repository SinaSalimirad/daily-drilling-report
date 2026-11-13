import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { DateField, SelectField, TextField } from "@/shared/components/form-fields";
import { DESIGNATION_ITEMS, RIG_TYPE_ITEMS, WELL_TYPE_ITEMS } from "../constants";
import type { WellFormApi } from "../hooks/use-well-form";
import { needsWaterDepth } from "../lib/well-form";

const sectionGridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2";

type Props = {
  form: WellFormApi;
  projectItems: ReadonlyArray<{ value: string; label: string }>;
  projectLocked: boolean;
};

export function WellFormFields({ form, projectItems, projectLocked }: Props) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_auto_1fr]">
      <FieldSet className="min-w-0">
        <FieldLegend>General Information</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <div className="sm:col-span-2">
            <form.Field name="projectId">
              {(field) => (
                <SelectField
                  field={field}
                  required
                  disabled={projectLocked}
                  label="Project"
                  placeholder={projectItems.length === 0 ? "No projects yet" : "Select project"}
                  items={projectItems}
                />
              )}
            </form.Field>
          </div>
          <form.Field name="name">
            {(field) => (
              <TextField field={field} required label="Well Name" placeholder="e.g. AZN-101" />
            )}
          </form.Field>
          <form.Field name="spudDate">
            {(field) => (
              <DateField field={field} required label="Spud Date" placeholder="YYYY-MM-DD" />
            )}
          </form.Field>
          <form.Field name="designation">
            {(field) => (
              <SelectField
                field={field}
                required
                label="Designation"
                placeholder="Select designation"
                items={DESIGNATION_ITEMS}
              />
            )}
          </form.Field>
          <form.Field name="wellType">
            {(field) => (
              <SelectField
                field={field}
                required
                label="Well Type"
                placeholder="Select well type"
                items={WELL_TYPE_ITEMS}
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      {/* Horizontal when the sections are stacked, vertical when they sit side by side. */}
      <Separator className="xl:hidden" />
      <Separator orientation="vertical" className="hidden xl:block" />

      <FieldSet className="min-w-0">
        <FieldLegend>Rig</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <div className="sm:col-span-2">
            <form.Field name="rigName">
              {(field) => (
                <TextField field={field} required label="Rig Name" placeholder="e.g. NDC-110" />
              )}
            </form.Field>
          </div>
          <form.Field
            name="rigType"
            listeners={{
              // A leftover depth must not survive a switch to onshore.
              onChange: ({ value }) => {
                if (!needsWaterDepth(value)) form.setFieldValue("waterDepthM", "");
              },
            }}
          >
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

          {/* Always visible, but only active for offshore rigs. */}
          <form.Subscribe selector={(state) => state.values.rigType}>
            {(rigType) => (
              <form.Field name="waterDepthM">
                {(field) => (
                  <TextField
                    field={field}
                    required={needsWaterDepth(rigType)}
                    disabled={!needsWaterDepth(rigType)}
                    numeric
                    label="Water Depth (m)"
                    placeholder="e.g. 65.5"
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
