"use client";

import { isAxiosError } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useProducts } from "@/features/product/hooks/use-product";
import { useReports } from "@/features/report/hooks/use-report";
import { useWells } from "@/features/well/hooks/use-well";
import { useCreateInventory } from "../hooks/use-inventory";
import { useInventoryForm } from "../hooks/use-inventory-form";
import { type InventoryFormValues, toPayload } from "../lib/inventory-form";
import { InventoryFormSheet } from "./inventory-form-sheet";
import { productLabel, toReportItems } from "./inventory-items";

export function InventorySheet() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: createInventory } = useCreateInventory();

  // These lists are already cached by the Wells, Reports and Products pages.
  const { data: wells = [] } = useWells();
  const { data: reports = [] } = useReports();
  const { data: products = [] } = useProducts();
  // Well names are only unique inside a project, so the project is part of the label.
  const wellItems = wells.map((well) => ({
    value: well.id,
    label: `${well.name} (${well.projectName})`,
  }));
  const productItems = products.map((product) => ({
    value: product.id,
    label: productLabel({ name: product.name, size: product.size, unit: product.unit }),
  }));

  const form = useInventoryForm(async (values: InventoryFormValues) => {
    setSubmitError(null);

    try {
      await createInventory(toPayload(values));
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? "This report already has this product."
          : "Could not add the inventory. Please try again.",
      );
      return false;
    }

    setOpen(false);
    return true;
  });

  return (
    <InventoryFormSheet
      form={form}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setSubmitError(null);
        }
      }}
      title="Add New Inventory"
      submitLabel="Add Inventory"
      submittingLabel="Adding..."
      error={submitError}
      wellItems={wellItems}
      reportItems={toReportItems(reports)}
      productItems={productItems}
      trigger={
        <>
          <Plus className="size-4" />
          Add Inventory
        </>
      }
    />
  );
}
