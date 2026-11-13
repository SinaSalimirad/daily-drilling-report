import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { wellApi } from "../api/well.api";
import type { UpdateWellInput } from "../type";

export const wellKeys = {
  all: ["wells"] as const,
  list: () => [...wellKeys.all, "list"] as const,
};

export const useWells = () => useQuery({ queryKey: wellKeys.list(), queryFn: wellApi.list });

export function useCreateWell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wellApi.create,
    onSuccess: () => {
      toast.success("Well added");
      return queryClient.invalidateQueries({ queryKey: wellKeys.all });
    },
  });
}

export function useUpdateWell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWellInput }) => wellApi.edit(id, input),
    onSuccess: () => {
      toast.success("Well updated");
      return queryClient.invalidateQueries({ queryKey: wellKeys.all });
    },
  });
}

export function useDeleteWell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wellApi.remove,
    onSuccess: () => {
      toast.success("Well deleted");
      return queryClient.invalidateQueries({ queryKey: wellKeys.all });
    },
    onError: (error) =>
      toast.error(
        isAxiosError(error) && error.response?.status === 409
          ? "This well has sections or reports, so it can't be deleted."
          : "Could not delete the well. Please try again.",
      ),
  });
}
