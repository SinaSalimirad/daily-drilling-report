import { AsyncLocalStorage } from 'node:async_hooks';

// The user of the current request, for `created_by` / `updated_by` (docs/07, task 6). The
// store is entered once, synchronously, when the request arrives (`beginRequest`), as a
// mutable holder; the guard fills in the user when the session is resolved (`setAuthor`).
// Entering the store there (and not in the async session lookup) is what lets every later
// await of the request see it. Column defaults in `db/columns.ts` read it.

type Holder = { userId?: string };
const storage = new AsyncLocalStorage<Holder>();

/** Called synchronously at the start of each request. */
export const beginRequest = () => storage.enterWith({});

/** Makes `userId` the author of every write in the rest of this request. */
export const setAuthor = (userId: string) => {
  const holder = storage.getStore();
  if (holder) holder.userId = userId;
};

/** The author of the current write; undefined for seeds, scripts and tests without a session. */
export const currentUserId = (): string | undefined => storage.getStore()?.userId;
