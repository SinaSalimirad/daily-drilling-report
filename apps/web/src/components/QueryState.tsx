import { ApiError } from '@/lib/api-error';

/** Loading and error placeholders shared by pages. */
export function Loading({ what = 'Loading' }: { what?: string }) {
  return <p className="text-muted-foreground text-sm">{what}…</p>;
}

export function QueryError({ error }: { error: Error }) {
  return (
    <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm">
      <p className="font-medium text-destructive">Could not load the data</p>
      <p className="text-muted-foreground">{error.message}</p>
      {error instanceof ApiError && error.requestId ? (
        <p className="text-muted-foreground text-xs">Request ID: {error.requestId}</p>
      ) : null}
    </div>
  );
}
