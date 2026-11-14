"use client";

import { useEffect } from "react";
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
  const { mutateAsync: updateProduct } = useUpdateProduct();

  const form = useProductForm(async (values: ProductFormValues) => {
    try {
      await updateProduct({ id: product.id, input: toUpdatePayload(values) });
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
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
      onOpenChange={onOpenChange}
      title={`Edit ${product.name}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
    />
  );
}
