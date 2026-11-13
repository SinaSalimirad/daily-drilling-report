import type { CreateSectionInput, Section, UpdateSectionInput } from "../type";

// Every input is a string in the form (an unselected select is ""); `toPayload`
// converts them to the API types.
export type SectionFormValues = {
  wellId: string;
  sequence: string;
  name: string;
};

export const defaultValues: SectionFormValues = { wellId: "", sequence: "", name: "" };

type FieldErrors = Partial<Record<keyof SectionFormValues, string>>;

const isBlank = (value: string) => value.trim() === "";

/**
 * Form-level validation for instant feedback; returns per-field messages for TanStack Form.
 * The API validates the same rules again, so this is UX only, never the source of truth.
 */
export function validate({ value }: { value: SectionFormValues }) {
  const fields: FieldErrors = {};

  if (!value.wellId) fields.wellId = "Well is required";
  if (isBlank(value.name)) fields.name = "Section name is required";

  const sequence = Number(value.sequence);
  if (isBlank(value.sequence)) fields.sequence = "Sequence is required";
  else if (!Number.isInteger(sequence) || sequence <= 0) {
    fields.sequence = "Sequence must be a whole number greater than 0";
  }

  return Object.keys(fields).length > 0 ? { fields } : undefined;
}

/** Only call this after `validate` passed. */
export function toPayload(values: SectionFormValues): CreateSectionInput {
  return {
    wellId: values.wellId,
    sequence: Number(values.sequence),
    name: values.name.trim(),
  };
}

/** Fills the edit form from an existing section. */
export function toFormValues(section: Section): SectionFormValues {
  return { wellId: section.wellId, sequence: String(section.sequence), name: section.name };
}

/** The well of a section can't change, so an update is a create body without `wellId`. */
export function toUpdatePayload(values: SectionFormValues): UpdateSectionInput {
  const { wellId: _wellId, ...rest } = toPayload(values);

  return rest;
}
