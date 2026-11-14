"use client";

import { useEffect } from "react";
import { useUpdateInventory } from "../hooks/use-inventory";
import { useInventoryForm } from "../hooks/use-inventory-form";
import { type InventoryFormValues, toFormValues, toUpdatePayload } from "../lib/inventory-form";
import type { InventoryListItem } from "../type";
import { InventoryFormSheet } from "./inventory-form-sheet";
import { lockedItems } from "./inventory-items";

type Props = {
  inventory: InventoryListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InventoryEditSheet({ inventory, open, onOpenChange }: Props) {
  const { mutateAsync: updateInventory } = useUpdateInventory();

  const form = useInventoryForm(async (values: InventoryFormValues) => {
    try {
      await updateInventory({ id: inventory.id, input: toUpdatePayload(values) });
    } catch {
      // The hook shows the error as a toast; keep the sheet open so nothing typed is lost.
      return false;
    }

    onOpenChange(false);
    return true;
  }, toFormValues(inventory));

  // Load the latest saved values every time the sheet opens (the row may have changed).
  useEffect(() => {
    if (open) form.reset(toFormValues(inventory));
  }, [open, inventory, form]);

  return (
    <InventoryFormSheet
      form={form}
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${inventory.productName} · report #${inventory.reportNumber}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      {...lockedItems(inventory)}
      identityLocked
    />
  );
}
