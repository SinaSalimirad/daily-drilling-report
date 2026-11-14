import { isAxiosError } from "axios";

type MessagesByStatus = Partial<Record<number, string>>;

// Messages that mean the same thing on every screen. A feature can override any of them
// (login's 401 is "wrong password", not "session ended").
const commonMessages: MessagesByStatus = {
  401: "Your session has ended. Please log in again.",
  403: "You don't have permission to do this.",
  429: "Too many requests. Please wait a minute and try again.",
};

/**
 * The toast text for a failed API call: the feature's message for this status, else a common
 * one, else `fallback`. See docs/error-flow.md for what each status means.
 */
export function apiErrorMessage(error: unknown, fallback: string, byStatus: MessagesByStatus = {}) {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return "Can't reach the server. Check your connection and try again.";

  const { status } = error.response;
  return byStatus[status] ?? commonMessages[status] ?? fallback;
}
