import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-error";
import { wellApi } from "../api/well.api";
import type { UpdateWellInput } from "../type";

export const wellKeys = {
  all: ["wells"] as const,
  list: () => [...wellKeys.all, "list"] as const,
};

const duplicateName = { 409: "A well with this name already exists in this project." };

export const useWells = () => useQuery({ queryKey: wellKeys.list(), queryFn: wellApi.list });

export function useCreateWell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wellApi.create,
    onSuccess: () => {
      toast.success("Well added");
      return queryClient.invalidateQueries({ queryKey: wellKeys.all });
    },
    onError: (error) =>
      toast.error(
        apiErrorMessage(error, "Could not add the well. Please try again.", duplicateName),
      ),
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
    onError: (error) =>
      toast.error(
        apiErrorMessage(error, "Could not save the well. Please try again.", duplicateName),
      ),
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
        apiErrorMessage(error, "Could not delete the well. Please try again.", {
          409: "This well has sections or reports, so it can't be deleted.",
        }),
      ),
  });
}
