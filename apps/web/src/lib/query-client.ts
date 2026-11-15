import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';

// Queries retry network failures twice; mutations never retry (docs/05-error-flow.md).

export function makeQueryClient() {
  return new QueryClient({
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
