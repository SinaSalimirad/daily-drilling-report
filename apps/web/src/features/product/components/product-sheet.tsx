"use client";

import { isAxiosError } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateProduct } from "../hooks/use-product";
import { useProductForm } from "../hooks/use-product-form";
import { type ProductFormValues, toPayload } from "../lib/product-form";
import { ProductFormSheet } from "./product-form-sheet";

export function ProductSheet() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: createProduct } = useCreateProduct();

  const form = useProductForm(async (values: ProductFormValues) => {
    setSubmitError(null);

    try {
      await createProduct(toPayload(values));
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "A product with the same name, size and unit already exists."
          : "Could not add the product. Please try again.",
      );
      return false;
    }

    setOpen(false);
    return true;
  });

  return (
    <ProductFormSheet
      form={form}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setSubmitError(null);
        }
      }}
      title="Add New Product"
      submitLabel="Add Product"
      submittingLabel="Adding..."
      error={submitError}
      trigger={
        <>
          <Plus className="size-4" />
          Add Product
        </>
      }
    />
  );
}
