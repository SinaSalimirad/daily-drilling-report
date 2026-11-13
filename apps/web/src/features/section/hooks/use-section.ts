import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { sectionApi } from "../api/section.api";
import type { UpdateSectionInput } from "../type";

export const sectionKeys = {
  all: ["sections"] as const,
  list: () => [...sectionKeys.all, "list"] as const,
};

export const useSections = () =>
  useQuery({ queryKey: sectionKeys.list(), queryFn: sectionApi.list });

export function useCreateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sectionApi.create,
    onSuccess: () => {
      toast.success("Section added");
      return queryClient.invalidateQueries({ queryKey: sectionKeys.all });
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSectionInput }) =>
      sectionApi.edit(id, input),
    onSuccess: () => {
      toast.success("Section updated");
      return queryClient.invalidateQueries({ queryKey: sectionKeys.all });
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sectionApi.remove,
    onSuccess: () => {
      toast.success("Section deleted");
      return queryClient.invalidateQueries({ queryKey: sectionKeys.all });
    },
    onError: (error) =>
      toast.error(
        isAxiosError(error) && error.response?.status === 409
          ? "This section has reports, so it can't be deleted."
          : "Could not delete the section. Please try again.",
      ),
  });
}
