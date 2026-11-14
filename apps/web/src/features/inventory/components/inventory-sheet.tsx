"use client";

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
    try {
      await createInventory(toPayload(values));
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
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
        if (!next) form.reset();
      }}
      title="Add New Inventory"
      submitLabel="Add Inventory"
      submittingLabel="Adding..."
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
