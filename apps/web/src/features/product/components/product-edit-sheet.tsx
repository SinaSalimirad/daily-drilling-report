"use client";

import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { useUpdateProduct } from "../hooks/use-product";
import { useProductForm } from "../hooks/use-product-form";
import { type ProductFormValues, toFormValues, toUpdatePayload } from "../lib/product-form";
import type { Product } from "../type";
import { ProductFormSheet } from "./product-form-sheet";

type Props = {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductEditSheet({ product, open, onOpenChange }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: updateProduct } = useUpdateProduct();

  const form = useProductForm(async (values: ProductFormValues) => {
    setSubmitError(null);

    try {
      await updateProduct({ id: product.id, input: toUpdatePayload(values) });
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "A product with the same name, size and unit already exists."
          : "Could not save the product. Please try again.",
      );
      return false;
    }

    onOpenChange(false);
    return true;
  }, toFormValues(product));

  // Load the latest saved values every time the sheet opens (the product may have changed).
  useEffect(() => {
    if (open) form.reset(toFormValues(product));
  }, [open, product, form]);

  return (
    <ProductFormSheet
      form={form}
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSubmitError(null);
      }}
      title={`Edit ${product.name}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      error={submitError}
    />
  );
}
