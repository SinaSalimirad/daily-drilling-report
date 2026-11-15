'use client';

import { Button } from '@/components/ui/button';

// Page-level error boundary (docs/05-error-flow.md: render errors are shown,
// never a blank page). The sidebar stays usable around it.

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main role="alert" className="flex flex-1 flex-col items-start gap-3 p-6">
      <h1 className="font-semibold text-lg">Something went wrong on this page</h1>
      <p className="text-muted-foreground text-sm">
        The page could not be displayed. Your other pages are not affected.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground text-xs">Reference: {error.digest}</p>
      ) : null}
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
