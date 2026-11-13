"use client";

import { useEffect, useState } from "react";
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: updateInventory } = useUpdateInventory();

  const form = useInventoryForm(async (values: InventoryFormValues) => {
    setSubmitError(null);

    try {
      await updateInventory({ id: inventory.id, input: toUpdatePayload(values) });
    } catch {
      setSubmitError("Could not save the inventory. Please try again.");
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
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSubmitError(null);
      }}
      title={`Edit ${inventory.productName} · report #${inventory.reportNumber}`}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      error={submitError}
      {...lockedItems(inventory)}
      identityLocked
    />
  );
}
