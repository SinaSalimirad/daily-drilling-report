import type { CreateInventoryInput, InventoryListItem, UpdateInventoryInput } from "../type";

// Every input is a string in the form (an unselected select is ""); `toPayload`
// converts them to the API types.
export type InventoryFormValues = {
  // Only used to narrow the report select; the API gets the report, not the well.
  wellId: string;
  reportId: string;
  productId: string;
  init: string;
  received: string;
  used: string;
  returned: string;
  unitPrice: string; // "" = no price
  note: string; // "" = no note
};

export const defaultValues: InventoryFormValues = {
  wellId: "",
  reportId: "",
  productId: "",
  init: "0",
  received: "0",
  used: "0",
  returned: "0",
  unitPrice: "",
  note: "",
};

type FieldErrors = Partial<Record<keyof InventoryFormValues, string>>;

const isBlank = (value: string) => value.trim() === "";

const QUANTITY_FIELDS = [
  ["init", "Initial"],
  ["received", "Received"],
  ["used", "Used"],
  ["returned", "Returned"],
] as const;

/**
 * Form-level validation for instant feedback; returns per-field messages for TanStack Form.
 * The API validates the same rules again, so this is UX only, never the source of truth.
 */
export function validate({ value }: { value: InventoryFormValues }) {
  const fields: FieldErrors = {};

  if (!value.wellId) fields.wellId = "Well is required";
  if (!value.reportId) fields.reportId = "Report is required";
  if (!value.productId) fields.productId = "Product is required";

  for (const [key, label] of QUANTITY_FIELDS) {
    const quantity = Number(value[key]);
    if (isBlank(value[key])) fields[key] = `${label} is required`;
    else if (!Number.isInteger(quantity) || quantity < 0) {
      fields[key] = `${label} must be a whole number, 0 or more`;
    }
  }

  if (!isBlank(value.unitPrice)) {
    const price = Number(value.unitPrice);
    if (!Number.isFinite(price) || price <= 0)
      fields.unitPrice = "Unit price must be greater than 0";
  }

  return Object.keys(fields).length > 0 ? { fields } : undefined;
}

/** Only call this after `validate` passed. */
export function toPayload(values: InventoryFormValues): CreateInventoryInput {
  return {
    reportId: values.reportId,
    productId: values.productId,
    init: Number(values.init),
    received: Number(values.received),
    used: Number(values.used),
    returned: Number(values.returned),
    unitPrice: isBlank(values.unitPrice) ? null : Number(values.unitPrice),
    note: isBlank(values.note) ? null : values.note.trim(),
  };
}

/** Fills the edit form from an existing inventory row. */
export function toFormValues(inventory: InventoryListItem): InventoryFormValues {
  return {
    wellId: inventory.wellId,
    reportId: inventory.reportId,
    productId: inventory.productId,
    init: String(inventory.init),
    received: String(inventory.received),
    used: String(inventory.used),
    returned: String(inventory.returned),
    unitPrice: inventory.unitPrice === null ? "" : String(inventory.unitPrice),
    note: inventory.note ?? "",
  };
}

/** The report and product of a row can't change, so an update is a create body without them. */
export function toUpdatePayload(values: InventoryFormValues): UpdateInventoryInput {
  const { reportId: _reportId, productId: _productId, ...rest } = toPayload(values);

  return rest;
}
