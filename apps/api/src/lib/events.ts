import type { LogixlysiaStore } from 'logixlysia';

// Domain events of docs/06-logging.md: level info, `event` plus IDs, never bodies.
// Routes call this after the service has committed.

type EventContext = { request: Request; store: unknown };

export function logEvent(
  { request, store }: EventContext,
  event: string,
  fields: Record<string, unknown>,
): void {
  const logger = (store as Partial<LogixlysiaStore> | undefined)?.logger;
  logger?.info(request, event, { event, ...fields });
}
