"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { InventoryFormApi } from "../hooks/use-inventory-form";
import { InventoryFormFields, type ReportItem, type SelectItems } from "./inventory-form-fields";

type Props = {
  form: InventoryFormApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  submittingLabel: string;
  error: string | null;
  wellItems: SelectItems;
  /** Every report; the form filters them by the chosen well. */
  reportItems: ReadonlyArray<ReportItem>;
  productItems: SelectItems;
  /** True when editing: a row can't move to another well, report or product. */
  identityLocked?: boolean;
  /** Rendered as the button that opens the sheet; leave out when the parent controls `open`. */
  trigger?: ReactNode;
};

// The sheet layout shared by "Add inventory" and "Edit inventory".
export function InventoryFormSheet({
  form,
  open,
  onOpenChange,
  title,
  submitLabel,
  submittingLabel,
  error,
  wellItems,
  reportItems,
  productItems,
  identityLocked = false,
  trigger,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <SheetTrigger render={<Button size="lg" className="h-10 px-4" />}>{trigger}</SheetTrigger>
      )}

      <SheetContent
        side="top"
        showCloseButton={false}
        className="mx-auto flex h-[90dvh] w-[96vw] max-w-360 flex-col overflow-hidden rounded-b-xl p-0"
      >
        <form
          id="inventory-form"
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <SheetHeader className="w-full shrink-0 border-b px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <SheetClose
                  render={<Button size="icon" variant="ghost" className="size-8 shrink-0" />}
                >
                  <ChevronLeft className="size-5" />
                </SheetClose>

                <SheetTitle className="truncate text-lg">{title}</SheetTitle>
              </div>

              <div className="flex items-center gap-2">
                <SheetClose render={<Button className="h-10 px-4" variant="outline" size="lg" />}>
                  Discard
                </SheetClose>

                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button className="h-10 px-4" size="lg" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? submittingLabel : submitLabel}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
            <FieldGroup className="w-full max-w-none">
              <InventoryFormFields
                form={form}
                wellItems={wellItems}
                reportItems={reportItems}
                productItems={productItems}
                identityLocked={identityLocked}
              />
              {error && (
                <div role="alert" className="text-sm text-destructive">
                  {error}
                </div>
              )}
            </FieldGroup>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
