import type { CreateReportInput, Report, UpdateReportInput } from "../type";

// Every input is a string in the form (an unselected select is ""); `toPayload`
// converts them to the API types.
export type ReportFormValues = {
  wellId: string;
  sectionId: string;
  reportNumber: string;
  date: string; // picked in the calendar, stored as "YYYY-MM-DD", or "" when empty
  operatorReporter: string;
  contractorReporter: string;
  wellStatus: string;
  mudType: string;
  presentActivity: string;
  bitDepth: string;
  totalDepth: string;
  tvd: string;
};

export const defaultValues: ReportFormValues = {
  wellId: "",
  sectionId: "",
  reportNumber: "",
  date: "",
  operatorReporter: "",
  contractorReporter: "",
  wellStatus: "",
  mudType: "",
  presentActivity: "",
  bitDepth: "",
  totalDepth: "",
  tvd: "",
};

type FieldErrors = Partial<Record<keyof ReportFormValues, string>>;

const isBlank = (value: string) => value.trim() === "";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD (so "2026-02-30" is rejected). */
export function isValidDate(text: string): boolean {
  if (!DATE_PATTERN.test(text)) return false;

  const date = new Date(`${text}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

// Text fields that are required, with the label used in the error message.
const REQUIRED_TEXT = [
  ["operatorReporter", "Operator reporter"],
  ["contractorReporter", "Contractor reporter"],
  ["wellStatus", "Well status"],
  ["mudType", "Mud type"],
  ["presentActivity", "Present activity"],
] as const;

const DEPTH_FIELDS = [
  ["bitDepth", "Bit depth"],
  ["totalDepth", "Total depth"],
  ["tvd", "TVD"],
] as const;

/**
 * Form-level validation for instant feedback; returns per-field messages for TanStack Form.
 * The API validates the same rules again, so this is UX only, never the source of truth.
 */
export function validate({ value }: { value: ReportFormValues }) {
  const fields: FieldErrors = {};

  if (!value.wellId) fields.wellId = "Well is required";
  if (!value.sectionId) fields.sectionId = "Section is required";

  const reportNumber = Number(value.reportNumber);
  if (isBlank(value.reportNumber)) fields.reportNumber = "Report number is required";
  else if (!Number.isInteger(reportNumber) || reportNumber <= 0) {
    fields.reportNumber = "Report number must be a whole number greater than 0";
  }

  if (isBlank(value.date)) fields.date = "Date is required";
  else if (!isValidDate(value.date)) fields.date = "Use the format YYYY-MM-DD";

  for (const [key, label] of REQUIRED_TEXT) {
    if (isBlank(value[key])) fields[key] = `${label} is required`;
  }

  for (const [key, label] of DEPTH_FIELDS) {
    const depth = Number(value[key]);
    if (isBlank(value[key])) fields[key] = `${label} is required`;
    else if (!Number.isFinite(depth) || depth <= 0) fields[key] = `${label} must be greater than 0`;
  }

  return Object.keys(fields).length > 0 ? { fields } : undefined;
}

/** Only call this after `validate` passed. */
export function toPayload(values: ReportFormValues): CreateReportInput {
  return {
    wellId: values.wellId,
    sectionId: values.sectionId,
    reportNumber: Number(values.reportNumber),
    date: values.date,
    operatorReporter: values.operatorReporter.trim(),
    contractorReporter: values.contractorReporter.trim(),
    wellStatus: values.wellStatus.trim(),
    mudType: values.mudType.trim(),
    presentActivity: values.presentActivity.trim(),
    bitDepth: Number(values.bitDepth),
    totalDepth: Number(values.totalDepth),
    tvd: Number(values.tvd),
  };
}

/** Fills the edit form from an existing report. */
export function toFormValues(report: Report): ReportFormValues {
  return {
    wellId: report.wellId,
    sectionId: report.sectionId,
    reportNumber: String(report.reportNumber),
    date: report.date,
    operatorReporter: report.operatorReporter,
    contractorReporter: report.contractorReporter,
    wellStatus: report.wellStatus,
    mudType: report.mudType,
    presentActivity: report.presentActivity,
    bitDepth: String(report.bitDepth),
    totalDepth: String(report.totalDepth),
    tvd: String(report.tvd),
  };
}

/** The well of a report can't change, so an update is a create body without `wellId`. */
export function toUpdatePayload(values: ReportFormValues): UpdateReportInput {
  const { wellId: _wellId, ...rest } = toPayload(values);

  return rest;
}
