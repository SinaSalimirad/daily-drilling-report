"use client";

import { ChevronLeft, Plus } from "lucide-react";
import { useState } from "react";
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
import { useCreateProduct } from "../hooks/use-product";
import { useProductForm } from "../hooks/use-product-form";
import { type ProductFormValues, toPayload } from "../lib/product-form";
import { ProductFormFields } from "./product-form-fields";

export function ProductSheet() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: createProduct } = useCreateProduct();

  const form = useProductForm(async (values: ProductFormValues) => {
    setSubmitError(null);

    try {
      await createProduct(toPayload(values));
    } catch {
      setSubmitError("Could not add the product. Please try again.");
      return false;
    }

    setOpen(false);
    return true;
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setSubmitError(null);
        }
      }}
    >
      <SheetTrigger render={<Button size="lg" className="h-10 px-4" />}>
        <Plus className="size-4" />
        Add Product
      </SheetTrigger>

      <SheetContent
        side="top"
        className="mx-auto flex h-[90dvh] w-[96vw] max-w-360 flex-col overflow-hidden rounded-b-xl p-0"
      >
        <form
          id="product-form"
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

                <SheetTitle className="truncate text-lg">Add New Product</SheetTitle>
              </div>

              <div className="flex items-center gap-2">
                <SheetClose render={<Button className="h-10 px-4" variant="outline" size="lg" />}>
                  Discard
                </SheetClose>

                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button className="h-10 px-4" size="lg" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Adding..." : "Add Product"}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
            <FieldGroup className="w-full max-w-none">
              <ProductFormFields form={form} />
              {submitError && (
                <div role="alert" className="text-sm text-destructive">
                  {submitError}
                </div>
              )}
            </FieldGroup>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
