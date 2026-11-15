import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export function useRecap(wellId: string, scope: 'section' | 'well') {
  return useQuery({
    queryKey: ['recap', wellId, scope] as const,
    enabled: wellId !== '',
    retry: false,
    queryFn: async () =>
      (await unwrap(api.v1.wells({ wellId }).recap.get({ query: { scope } as never }))).data,
  });
}
