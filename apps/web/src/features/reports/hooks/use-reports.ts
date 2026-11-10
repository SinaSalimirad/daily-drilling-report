import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportsApi } from "../api/reports.api";

const key = ["reports"] as const;

export const useReports = () => useQuery({ queryKey: key, queryFn: reportsApi.list });

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reportsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reportsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
