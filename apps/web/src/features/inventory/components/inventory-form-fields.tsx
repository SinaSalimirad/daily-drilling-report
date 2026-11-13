import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { SelectField, TextareaField, TextField } from "@/shared/components/form-fields";
import type { InventoryFormApi } from "../hooks/use-inventory-form";

const sectionGridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2";

export type SelectItems = ReadonlyArray<{ value: string; label: string }>;
export type ReportItem = { value: string; label: string; wellId: string };

type Props = {
  form: InventoryFormApi;
  wellItems: SelectItems;
  /** Every report; the form only shows the ones of the chosen well. */
  reportItems: ReadonlyArray<ReportItem>;
  productItems: SelectItems;
  /** True when editing: a row can't move to another well, report or product. */
  identityLocked: boolean;
};

export function InventoryFormFields({
  form,
  wellItems,
  reportItems,
  productItems,
  identityLocked,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_auto_1fr]">
      <FieldSet className="min-w-0">
        <FieldLegend>Report and Product</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field
            name="wellId"
            listeners={{
              // A report belongs to one well, so the old choice is no longer valid.
              onChange: () => form.setFieldValue("reportId", ""),
            }}
          >
            {(field) => (
              <SelectField
                field={field}
                required
                disabled={identityLocked}
                label="Well"
                placeholder={wellItems.length === 0 ? "No wells yet" : "Select well"}
                items={wellItems}
              />
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.wellId}>
            {(wellId) => {
              const items = reportItems.filter((report) => report.wellId === wellId);

              return (
                <form.Field name="reportId">
                  {(field) => (
                    <SelectField
                      field={field}
                      required
                      disabled={identityLocked || !wellId}
                      label="Report"
                      placeholder={
                        !wellId
                          ? "Select a well first"
                          : items.length === 0
                            ? "This well has no reports"
                            : "Select report"
                      }
                      items={items}
                    />
                  )}
                </form.Field>
              );
            }}
          </form.Subscribe>

          <form.Field name="productId">
            {(field) => (
              <SelectField
                field={field}
                required
                disabled={identityLocked}
                label="Product"
                placeholder={productItems.length === 0 ? "No products yet" : "Select product"}
                items={productItems}
              />
            )}
          </form.Field>
          <form.Field name="unitPrice">
            {(field) => (
              <TextField
                field={field}
                numeric
                label="Unit Price"
                placeholder="Optional, e.g. 12.5"
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      {/* Horizontal when the sections are stacked, vertical when they sit side by side. */}
      <Separator className="xl:hidden" />
      <Separator orientation="vertical" className="hidden xl:block" />

      <FieldSet className="min-w-0">
        <FieldLegend>Quantities</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field name="init">
            {(field) => (
              <TextField field={field} required numeric label="Initial" placeholder="e.g. 10" />
            )}
          </form.Field>
          <form.Field name="received">
            {(field) => (
              <TextField field={field} required numeric label="Received" placeholder="e.g. 5" />
            )}
          </form.Field>
          <form.Field name="used">
            {(field) => (
              <TextField field={field} required numeric label="Used" placeholder="e.g. 3" />
            )}
          </form.Field>
          <form.Field name="returned">
            {(field) => (
              <TextField field={field} required numeric label="Returned" placeholder="e.g. 1" />
            )}
          </form.Field>
        </FieldGroup>

        <form.Field name="note">
          {(field) => (
            <TextareaField field={field} label="Note" placeholder="Optional note about this row" />
          )}
        </form.Field>
      </FieldSet>
    </div>
  );
}
