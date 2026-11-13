import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { DateField, SelectField, TextField } from "@/shared/components/form-fields";
import type { ReportFormApi } from "../hooks/use-report-form";

const sectionGridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2";

export type SelectItems = ReadonlyArray<{ value: string; label: string }>;
export type SectionItem = { value: string; label: string; wellId: string };

type Props = {
  form: ReportFormApi;
  wellItems: SelectItems;
  /** Every section; the select only shows the ones of the chosen well. */
  sectionItems: ReadonlyArray<SectionItem>;
  wellLocked: boolean;
};

export function ReportFormFields({ form, wellItems, sectionItems, wellLocked }: Props) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_auto_1fr]">
      <FieldSet className="min-w-0">
        <FieldLegend>General Information</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field
            name="wellId"
            listeners={{
              // A section belongs to one well, so the old choice is no longer valid.
              onChange: () => form.setFieldValue("sectionId", ""),
            }}
          >
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

          <form.Subscribe selector={(state) => state.values.wellId}>
            {(wellId) => {
              const items = sectionItems.filter((section) => section.wellId === wellId);

              return (
                <form.Field name="sectionId">
                  {(field) => (
                    <SelectField
                      field={field}
                      required
                      disabled={!wellId}
                      label="Section"
                      placeholder={
                        !wellId
                          ? "Select a well first"
                          : items.length === 0
                            ? "This well has no sections"
                            : "Select section"
                      }
                      items={items}
                    />
                  )}
                </form.Field>
              );
            }}
          </form.Subscribe>

          <form.Field name="reportNumber">
            {(field) => (
              <TextField
                field={field}
                required
                numeric
                label="Report Number"
                placeholder="e.g. 1"
              />
            )}
          </form.Field>
          <form.Field name="date">
            {(field) => <DateField field={field} required label="Date" placeholder="YYYY-MM-DD" />}
          </form.Field>
          <form.Field name="operatorReporter">
            {(field) => (
              <TextField
                field={field}
                required
                label="Operator Reporter"
                placeholder="Name of the operator's reporter"
              />
            )}
          </form.Field>
          <form.Field name="contractorReporter">
            {(field) => (
              <TextField
                field={field}
                required
                label="Contractor Reporter"
                placeholder="Name of the contractor's reporter"
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      {/* Horizontal when the sections are stacked, vertical when they sit side by side. */}
      <Separator className="xl:hidden" />
      <Separator orientation="vertical" className="hidden xl:block" />

      <FieldSet className="min-w-0">
        <FieldLegend>Status, Mud and Depths</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field name="wellStatus">
            {(field) => (
              <TextField field={field} required label="Well Status" placeholder="e.g. Drilling" />
            )}
          </form.Field>
          <form.Field name="mudType">
            {(field) => (
              <TextField field={field} required label="Mud Type" placeholder="e.g. WBM" />
            )}
          </form.Field>
          <form.Field name="presentActivity">
            {(field) => (
              <TextField
                field={field}
                required
                label="Present Activity"
                placeholder="e.g. Drilling 12 1/4 hole"
              />
            )}
          </form.Field>
          <form.Field name="tvd">
            {(field) => (
              <TextField field={field} required numeric label="TVD (m)" placeholder="e.g. 1180" />
            )}
          </form.Field>
          <form.Field name="bitDepth">
            {(field) => (
              <TextField
                field={field}
                required
                numeric
                label="Bit Depth (m)"
                placeholder="e.g. 1200.5"
              />
            )}
          </form.Field>
          <form.Field name="totalDepth">
            {(field) => (
              <TextField
                field={field}
                required
                numeric
                label="Total Depth (m)"
                placeholder="e.g. 1200.5"
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
