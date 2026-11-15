import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

// Open lists of the workbook (activities, fluid systems, pit mud types, sample sources).
// They change rarely, so they stay fresh for a while.

export const lookupKeys = { all: ['lookups'] as const };

export function useLookups() {
  return useQuery({
    queryKey: lookupKeys.all,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await unwrap(api.v1.lookups.get())).data,
  });
}
