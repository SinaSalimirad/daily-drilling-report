import { type CurrencyCode, MAX_NAME_LENGTH, MAX_NAMES, type RigType } from "../constants";
import type { CreateProjectInput, Project, UpdateProjectInput } from "../type";

// Every input is a string in the form; operators and contractors are comma-separated names.
// `toPayload` converts them to the API types.
export type ProjectFormValues = {
  name: string;
  field: string;
  operators: string;
  contractors: string;
  rigName: string;
  rigType: RigType | "";
  currencyCode: CurrencyCode | "";
};

export const defaultValues: ProjectFormValues = {
  name: "",
  field: "",
  operators: "",
  contractors: "",
  rigName: "",
  rigType: "",
  currencyCode: "",
};

type FieldErrors = Partial<Record<keyof ProjectFormValues, string>>;

const isBlank = (value: string) => value.trim() === "";

/** "Shell, BP" -> ["Shell", "BP"]. Blank entries (e.g. a trailing comma) are dropped. */
export function parseNames(text: string): string[] {
  return text
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

function namesError(text: string, label: string): string | undefined {
  const names = parseNames(text);

  if (names.length === 0) return `${label} is required`;
  if (names.length > MAX_NAMES) return `Enter at most ${MAX_NAMES} names, separated by a comma`;
  if (names.some((name) => name.length > MAX_NAME_LENGTH)) {
    return `Each name must be at most ${MAX_NAME_LENGTH} characters`;
  }
}

/**
 * Form-level validation for instant feedback; returns per-field messages for TanStack Form.
 * The API validates the same rules again, so this is UX only, never the source of truth.
 */
export function validate({ value }: { value: ProjectFormValues }) {
  const fields: FieldErrors = {};

  if (isBlank(value.name)) fields.name = "Project name is required";
  if (isBlank(value.field)) fields.field = "Field is required";
  if (isBlank(value.rigName)) fields.rigName = "Rig name is required";
  if (!value.rigType) fields.rigType = "Rig type is required";
  if (!value.currencyCode) fields.currencyCode = "Currency is required";

  const operatorsError = namesError(value.operators, "Operators");
  if (operatorsError) fields.operators = operatorsError;

  const contractorsError = namesError(value.contractors, "Contractors");
  if (contractorsError) fields.contractors = contractorsError;

  return Object.keys(fields).length > 0 ? { fields } : undefined;
}

/** Only call this after `validate` passed: it relies on `rigType` and `currencyCode` being set. */
export function toPayload(values: ProjectFormValues): CreateProjectInput {
  return {
    name: values.name.trim(),
    field: values.field.trim(),
    operators: parseNames(values.operators),
    contractors: parseNames(values.contractors),
    rigName: values.rigName.trim(),
    rigType: values.rigType as RigType,
    currencyCode: values.currencyCode as CurrencyCode,
  };
}

/** Fills the edit form from an existing project; name lists become "A, B". */
export function toFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    field: project.field,
    operators: project.operators.join(", "),
    contractors: project.contractors.join(", "),
    rigName: project.rigName,
    rigType: project.rigType,
    currencyCode: project.currencyCode,
  };
}

/** Every project field is required, so an update sends the same body as a create. */
export function toUpdatePayload(values: ProjectFormValues): UpdateProjectInput {
  return toPayload(values);
}
