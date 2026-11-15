'use client';

import { ApiError } from '@/lib/api-error';
import { useHealth } from './use-health';

export function HealthStatus() {
  const health = useHealth();

  if (health.isPending) {
    return <p className="text-muted-foreground text-sm">Checking the server…</p>;
  }

  if (health.isError) {
    const error = health.error;
    return (
      <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm">
        <p className="font-medium text-destructive">Server unavailable</p>
        <p className="text-muted-foreground">{error.message}</p>
        {error instanceof ApiError && error.requestId ? (
          <p className="text-muted-foreground text-xs">Request ID: {error.requestId}</p>
        ) : null}
      </div>
    );
  }

  const { status, database } = health.data;
  return (
    <p className="text-sm">
      Server: <span className="font-medium">{status === 'ok' ? 'online' : status}</span> · Database:{' '}
      <span className="font-medium">{database === 'up' ? 'connected' : database}</span>
    </p>
  );
}
