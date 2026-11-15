// docs/05-error-flow.md. Code throws these; only plugins/error-handler.ts turns
// them into a response body.

export type FieldIssue = { path: string; message: string };
export type ErrorDetails = FieldIssue[] | Record<string, unknown>;

/** Business-rule codes. Grow this list; never reuse a code. */
export type BusinessRuleCode =
  | 'REPORT_DATE_TAKEN'
  | 'REPORT_NOT_LATEST'
  | 'PIT_VOLUME_OVER_CAPACITY'
  | 'MUD_WEIGHT_OUT_OF_RANGE'
  | 'SURVEY_DEPTH_NOT_INCREASING'
  | 'BHA_TOOL_PRESSURE_REQUIRED'
  | 'WARNINGS_NOT_ACKNOWLEDGED'
  | 'IN_USE';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** Safe to show to a user: no SQL, stack traces or file paths. */
    message: string,
    readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details: FieldIssue[], message = 'Request validation failed') {
    super(422, 'VALIDATION_FAILED', message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Sign-in required') {
    super(401, 'UNAUTHENTICATED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission for this action') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'The request conflicts with existing data',
    details?: Record<string, unknown>,
    code: 'CONFLICT' | 'IN_USE' = 'CONFLICT',
  ) {
    super(409, code, message, details);
  }
}

export class RevisionMismatchError extends AppError {
  constructor(message = 'This record was changed by someone else') {
    super(409, 'REVISION_MISMATCH', message);
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: BusinessRuleCode, message: string, details?: Record<string, unknown>) {
    super(422, code, message, details);
  }
}
