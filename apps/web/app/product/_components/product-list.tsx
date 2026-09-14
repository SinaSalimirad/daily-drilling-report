import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const units = ["kg", "lb", "mt", "gal", "lit", "m3", "bbl"] as const;

type ProductListFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductListForm({ open, onOpenChange }: ProductListFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>Create Product</SheetTitle>

          <SheetDescription>
            Add a new drilling fluid product to your list.
          </SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FieldGroup className="gap-5">
              <Field>
                <Label htmlFor="product">Product Name</Label>

                <Input id="product" name="product" placeholder="e.g. Barite" />
              </Field>

              <Field>
                <Label htmlFor="size">Size</Label>

                <Input
                  id="size"
                  name="size"
                  type="number"
                  placeholder="e.g. 25"
                />
              </Field>

              <Field>
                <Label htmlFor="unit">Unit</Label>

                <Combobox items={units}>
                  <ComboboxInput
                    id="unit"
                    name="unit"
                    placeholder="Search a unit..."
                  />

                  <ComboboxContent>
                    <ComboboxEmpty>No units found.</ComboboxEmpty>

                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>

              <Field>
                <Label htmlFor="specificGravity">Specific Gravity</Label>

                <Input
                  id="specificGravity"
                  name="specificGravity"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 4.20"
                />
              </Field>

              <Field>
                <Label htmlFor="origin">Origin</Label>

                <Select name="origin">
                  <SelectTrigger id="origin">
                    <SelectValue placeholder="Select origin" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="foreign">Foreign</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label htmlFor="unitPrice">Unit Price</Label>

                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 120"
                />
              </Field>
            </FieldGroup>
          </div>

          <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button variant="outline">Save as Draft</Button>

            <Button type="submit">Create Product</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
