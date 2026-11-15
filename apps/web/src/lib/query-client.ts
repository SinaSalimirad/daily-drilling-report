import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';

// Queries retry network failures twice; mutations never retry (docs/05-error-flow.md).

/** An expired or revoked session: back to the sign-in page, then back here. */
function onUnauthenticated(error: unknown) {
  if (
    error instanceof ApiError &&
    error.code === 'UNAUTHENTICATED' &&
    typeof window !== 'undefined'
  ) {
    const here = window.location.pathname;
    if (here !== '/sign-in') window.location.assign(`/sign-in?next=${encodeURIComponent(here)}`);
  }
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: onUnauthenticated }),
    mutationCache: new MutationCache({ onError: onUnauthenticated }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < 2 && error instanceof ApiError && error.isNetworkFailure,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
