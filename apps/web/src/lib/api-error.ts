// The error every feature hook throws (docs/05-error-flow.md, "Flow in the frontend").

export type FieldIssue = { path: string; message: string };

type ErrorBody = {
  error: { code: string; message: string; details?: unknown; requestId?: string };
};

/** Status 0 means the request never got an answer from the API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Builds an ApiError from a failed response; tolerates bodies that are not ours (e.g. a 502 page). */
  static fromResponse(status: number, value: unknown): ApiError {
    if (isErrorBody(value)) {
      const { code, message, details, requestId } = value.error;
      return new ApiError(status, code, message, details, requestId);
    }
    if (status === 502 || status === 503 || status === 504) {
      return new ApiError(status, 'UNAVAILABLE', 'The server is not reachable. Try again shortly.');
    }
    return new ApiError(
      status,
      'UNEXPECTED_RESPONSE',
      `Unexpected response from the server (${status}).`,
    );
  }

  static network(): ApiError {
    return new ApiError(0, 'NETWORK', 'The server could not be reached. Check your connection.');
  }

  /** Network failures and unavailable upstreams; the only errors a query retries. */
  get isNetworkFailure(): boolean {
    return this.status === 0 || this.code === 'UNAVAILABLE';
  }

  /** Field issues of a VALIDATION_FAILED error, for mapping onto form fields. */
  get fieldIssues(): FieldIssue[] {
    return this.code === 'VALIDATION_FAILED' && Array.isArray(this.details)
      ? (this.details as FieldIssue[])
      : [];
  }
}

function isErrorBody(value: unknown): value is ErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

/** Eden Treaty returns `{ data, error }`; feature hooks turn that into data or a thrown ApiError. */
export async function unwrap<TData>(
  call: Promise<
    { data: TData; error: null } | { data: null; error: { status: unknown; value: unknown } }
  >,
): Promise<TData> {
  let result: Awaited<typeof call>;
  try {
    result = await call;
  } catch {
    throw ApiError.network();
  }
  if (result.error) {
    const status = typeof result.error.status === 'number' ? result.error.status : 0;
    throw ApiError.fromResponse(status, result.error.value);
  }
  return result.data as TData;
}
