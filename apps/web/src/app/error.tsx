'use client';

import { Button } from '@/components/ui/button';

// Page-level error boundary (docs/05-error-flow.md: render errors are shown,
// never a blank page). The sidebar stays usable around it.
// Next.js 16: the thrown value may not be an Error (a client component can throw
// anything), and `retry()` re-fetches and re-renders the segment.

function digestOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('digest' in error)) return undefined;
  return typeof error.digest === 'string' ? error.digest : undefined;
}

export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = digestOf(error);
  return (
    <main role="alert" className="flex flex-1 flex-col items-start gap-3 p-6">
      <h1 className="font-semibold text-lg">Something went wrong on this page</h1>
      <p className="text-muted-foreground text-sm">
        The page could not be displayed. Your other pages are not affected.
      </p>
      {digest ? <p className="text-muted-foreground text-xs">Reference: {digest}</p> : null}
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
