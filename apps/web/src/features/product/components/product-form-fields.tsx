import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ORIGIN_ITEMS, UNIT_ITEMS } from "../constants";
import type { ProductFormApi } from "../hooks/use-product-form";
import { SelectField, TextField } from "./product-fields";

const sectionGridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2";

export function ProductFormFields({ form }: { form: ProductFormApi }) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_auto_1fr]">
      <FieldSet className="min-w-0">
        <FieldLegend>General Information</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <div className="sm:col-span-2">
            <form.Field name="name">
              {(field) => (
                <TextField field={field} required label="Product Name" placeholder="e.g. Barite" />
              )}
            </form.Field>
          </div>
          <form.Field name="size">
            {(field) => (
              <TextField
                field={field}
                required
                label="Size (Quantity)"
                placeholder="e.g. 25"
                numeric
              />
            )}
          </form.Field>
          <form.Field name="origin">
            {(field) => (
              <SelectField
                field={field}
                required
                label="Origin"
                placeholder="Select origin"
                items={ORIGIN_ITEMS}
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      {/* Horizontal when the sections are stacked, vertical when they sit side by side. */}
      <Separator className="xl:hidden" />
      <Separator orientation="vertical" className="hidden xl:block" />

      <FieldSet className="min-w-0">
        <FieldLegend>Technical Specifications</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field name="unit">
            {(field) => (
              <SelectField
                field={field}
                required
                label="Unit"
                placeholder="Select unit"
                items={UNIT_ITEMS}
              />
            )}
          </form.Field>
          <form.Field name="specificGravity">
            {(field) => (
              <TextField
                field={field}
                label="Specific Gravity (SG)"
                placeholder="e.g. 4.20"
                numeric
              />
            )}
          </form.Field>
          <form.Field name="height">
            {(field) => <TextField field={field} label="Height" placeholder="Optional" numeric />}
          </form.Field>
          <form.Field name="width">
            {(field) => <TextField field={field} label="Width" placeholder="Optional" numeric />}
          </form.Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
