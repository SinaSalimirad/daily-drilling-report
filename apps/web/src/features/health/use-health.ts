import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export const healthKeys = {
  status: () => ['health', 'status'] as const,
};

/** API and database health (GET /api/health). */
export function useHealth() {
  return useQuery({
    queryKey: healthKeys.status(),
    queryFn: async () => (await unwrap(api.health.get())).data,
  });
}
