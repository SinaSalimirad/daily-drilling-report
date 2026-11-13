import type { Designation, RigType, WellType } from "../constants";
import type { CreateWellInput, UpdateWellInput, Well } from "../type";

// Every input is a string in the form (an unselected select is ""); `toPayload`
// converts them to the API types.
export type WellFormValues = {
  projectId: string;
  name: string;
  designation: Designation | "";
  spudDate: string; // picked in the calendar, stored as "YYYY-MM-DD", or "" when empty
  wellType: WellType | "";
  rigName: string;
  rigType: RigType | "";
  waterDepthM: string;
};

export const defaultValues: WellFormValues = {
  projectId: "",
  name: "",
  designation: "",
  spudDate: "",
  wellType: "",
  rigName: "",
  rigType: "",
  waterDepthM: "",
};

type FieldErrors = Partial<Record<keyof WellFormValues, string>>;

const isBlank = (value: string) => value.trim() === "";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD (so "2026-02-30" is rejected). */
export function isValidDate(text: string): boolean {
  if (!DATE_PATTERN.test(text)) return false;

  const date = new Date(`${text}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

/** Only offshore wells have a water depth; the field is hidden for onshore rigs. */
export const needsWaterDepth = (rigType: WellFormValues["rigType"]) => rigType === "offshore";

/**
 * Form-level validation for instant feedback; returns per-field messages for TanStack Form.
 * The API validates the same rules again, so this is UX only, never the source of truth.
 */
export function validate({ value }: { value: WellFormValues }) {
  const fields: FieldErrors = {};

  if (!value.projectId) fields.projectId = "Project is required";
  if (isBlank(value.name)) fields.name = "Well name is required";
  if (!value.designation) fields.designation = "Designation is required";
  if (isBlank(value.spudDate)) fields.spudDate = "Spud date is required";
  else if (!isValidDate(value.spudDate)) fields.spudDate = "Use the format YYYY-MM-DD";
  if (!value.wellType) fields.wellType = "Well type is required";
  if (isBlank(value.rigName)) fields.rigName = "Rig name is required";
  if (!value.rigType) fields.rigType = "Rig type is required";

  if (needsWaterDepth(value.rigType)) {
    const depth = Number(value.waterDepthM);
    if (isBlank(value.waterDepthM))
      fields.waterDepthM = "Water depth is required for offshore rigs";
    else if (!Number.isFinite(depth) || depth <= 0) {
      fields.waterDepthM = "Water depth must be greater than 0";
    }
  }

  return Object.keys(fields).length > 0 ? { fields } : undefined;
}

/** Only call this after `validate` passed: it relies on the select fields being set. */
export function toPayload(values: WellFormValues): CreateWellInput {
  return {
    projectId: values.projectId,
    name: values.name.trim(),
    designation: values.designation as Designation,
    spudDate: values.spudDate,
    wellType: values.wellType as WellType,
    rigName: values.rigName.trim(),
    rigType: values.rigType as RigType,
    // An onshore well must not have a water depth, even if one was typed before switching.
    waterDepthM: needsWaterDepth(values.rigType) ? Number(values.waterDepthM) : null,
  };
}

/** Fills the edit form from an existing well. */
export function toFormValues(well: Well): WellFormValues {
  return {
    projectId: well.projectId,
    name: well.name,
    designation: well.designation,
    spudDate: well.spudDate,
    wellType: well.wellType,
    rigName: well.rigName,
    rigType: well.rigType,
    waterDepthM: well.waterDepthM == null ? "" : String(well.waterDepthM),
  };
}

/** The project of a well can't change, so an update is a create body without `projectId`. */
export function toUpdatePayload(values: WellFormValues): UpdateWellInput {
  const { projectId: _projectId, ...rest } = toPayload(values);

  return rest;
}
