import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ORIGIN_ITEMS, UNIT_ITEMS } from "../constants";
import type { ProductFormApi } from "../hooks/use-product-form";
import { SelectField, TextField } from "./product-fields";

const sectionGridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2";

export function ProductFormFields({ form }: { form: ProductFormApi }) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <FieldSet className="min-w-0">
        <FieldLegend>General Information</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field name="name">
            {(field) => <TextField field={field} label="Product Name" placeholder="e.g. Barite" />}
          </form.Field>
          <form.Field name="size">
            {(field) => (
              <TextField field={field} label="Size (Quantity)" placeholder="e.g. 25" numeric />
            )}
          </form.Field>
          <form.Field name="origin">
            {(field) => (
              <SelectField
                field={field}
                label="Origin"
                placeholder="Select origin"
                items={ORIGIN_ITEMS}
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="min-w-0">
        <FieldLegend>Technical Specifications</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field name="unit">
            {(field) => (
              <SelectField
                field={field}
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

      <Separator className="xl:col-span-2" />

      <FieldSet className="min-w-0 xl:col-span-2">
        <FieldLegend>Pricing Information</FieldLegend>
        <FieldGroup className={sectionGridClass}>
          <form.Field name="price">
            {(field) => <TextField field={field} label="Unit Price" placeholder="0.00" numeric />}
          </form.Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
