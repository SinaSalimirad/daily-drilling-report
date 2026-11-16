import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export const dashboardKeys = { consumption: ['dashboard', 'consumption'] as const };

export function useConsumption() {
  return useQuery({
    queryKey: dashboardKeys.consumption,
    queryFn: async () => (await unwrap(api.v1.dashboard.consumption.get())).data,
  });
}
