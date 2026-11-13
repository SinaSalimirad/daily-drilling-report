import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { reportApi } from "../api/report.api";
import type { UpdateReportInput } from "../type";

export const reportKeys = {
  all: ["reports"] as const,
  list: () => [...reportKeys.all, "list"] as const,
};

export const useReports = () => useQuery({ queryKey: reportKeys.list(), queryFn: reportApi.list });

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportApi.create,
    onSuccess: () => {
      toast.success("Report added");
      return queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReportInput }) =>
      reportApi.edit(id, input),
    onSuccess: () => {
      toast.success("Report updated");
      return queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportApi.remove,
    onSuccess: () => {
      toast.success("Report deleted");
      return queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
    onError: (error) =>
      toast.error(
        isAxiosError(error) && error.response?.status === 409
          ? "This report has inventories, so it can't be deleted."
          : "Could not delete the report. Please try again.",
      ),
  });
}
