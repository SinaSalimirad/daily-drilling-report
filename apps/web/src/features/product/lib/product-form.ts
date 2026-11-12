import type { ProductOrigin, ProductUnit } from "../constants";
import type { CreateProductInput } from "../type";

// Every input is a string in the form; `toPayload` converts to the API types.
export type ProductFormValues = {
  name: string;
  size: string;
  unit: ProductUnit | "";
  origin: ProductOrigin | "";
  width: string;
  height: string;
  specificGravity: string;
  price: string;
};

export const defaultValues: ProductFormValues = {
  name: "",
  size: "",
  unit: "",
  origin: "",
  width: "",
  height: "",
  specificGravity: "",
  price: "",
};

type FieldErrors = Partial<Record<keyof ProductFormValues, string>>;

const isBlank = (value: string) => value.trim() === "";
const isPositive = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0;

/**
 * Form-level validation for instant feedback; returns per-field messages for TanStack Form.
 * The API validates the same rules again, so this is UX only, never the source of truth.
 */
export function validate({ value }: { value: ProductFormValues }) {
  const fields: FieldErrors = {};

  if (isBlank(value.name)) fields.name = "Product name is required";
  if (isBlank(value.size)) fields.size = "Size is required";
  else if (!isPositive(value.size)) fields.size = "Size must be greater than 0";
  if (!value.unit) fields.unit = "Unit is required";
  if (!value.origin) fields.origin = "Origin is required";

  for (const key of ["specificGravity", "price", "width", "height"] as const) {
    if (!isBlank(value[key]) && !isPositive(value[key])) {
      fields[key] = "Must be greater than 0";
    }
  }

  // Width and height must be provided together.
  if (isBlank(value.width) !== isBlank(value.height)) {
    const missing = isBlank(value.width) ? "width" : "height";
    fields[missing] ??= "Width and height must be provided together";
  }

  return Object.keys(fields).length > 0 ? { fields } : undefined;
}

/** Only call this after `validate` passed: it relies on `unit` and `origin` being selected. */
export function toPayload(values: ProductFormValues): CreateProductInput {
  const optionalNumber = (text: string) => (isBlank(text) ? undefined : Number(text));

  return {
    name: values.name.trim(),
    size: Number(values.size),
    unit: values.unit as ProductUnit,
    origin: values.origin as ProductOrigin,
    width: optionalNumber(values.width),
    height: optionalNumber(values.height),
    specificGravity: optionalNumber(values.specificGravity),
    price: optionalNumber(values.price),
  };
}
