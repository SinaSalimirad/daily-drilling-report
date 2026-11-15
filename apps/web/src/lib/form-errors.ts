import { toast } from 'sonner';
import type { z } from 'zod';
import { ApiError } from './api-error';

// docs/05 "Flow in the frontend": VALIDATION_FAILED details go onto the form fields
// (first one focused); known conflicts go onto the field they concern; everything else
// is a toast with the request id, and the form keeps its values.

export type FieldErrors = Record<string, string>;

/** zod issues (client) → field errors keyed by dotted path, e.g. `unitSystem.density`. */
export function issuesToFieldErrors(issues: z.core.$ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const path = issue.path.join('.') || '_form';
    errors[path] ??= issue.message;
  }
  return errors;
}

/**
 * Server error → field errors. `body.` is stripped from validation paths; a unique
 * constraint listed in `conflicts` becomes an error on its field. Returns null when the
 * error does not belong to a field (the caller shows a toast).
 */
export function serverFieldErrors(
  error: unknown,
  conflicts: Record<string, { field: string; message: string }> = {},
): FieldErrors | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'VALIDATION_FAILED' && error.fieldIssues.length > 0) {
    const errors: FieldErrors = {};
    for (const { path, message } of error.fieldIssues) {
      errors[path.replace(/^body\.?/, '') || '_form'] ??= message;
    }
    return errors;
  }
  const constraint = (error.details as { constraint?: string } | undefined)?.constraint;
  const conflict = constraint ? conflicts[constraint] : undefined;
  if (error.code === 'CONFLICT' && conflict) return { [conflict.field]: conflict.message };
  return null;
}

/** Toast for errors that belong to no field (INTERNAL, network, …), with the request id. */
export function toastError(error: unknown, fallback = 'Something went wrong') {
  const message = error instanceof Error ? error.message : fallback;
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  toast.error(message, requestId ? { description: `Request ID: ${requestId}` } : undefined);
}

/** Moves focus to the input of the first field with an error (inputs use the field name as id). */
export function focusFirstError(errors: FieldErrors) {
  const first = Object.keys(errors)[0];
  if (first) document.getElementById(first)?.focus();
}
