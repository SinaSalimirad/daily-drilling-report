import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { projectApi } from "../api/project.api";
import type { UpdateProjectInput } from "../type";

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
};

export const useProjects = () =>
  useQuery({ queryKey: projectKeys.list(), queryFn: projectApi.list });

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      toast.success("Project added");
      return queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectApi.edit(id, input),
    onSuccess: () => {
      toast.success("Project updated");
      return queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.remove,
    onSuccess: () => {
      toast.success("Project deleted");
      return queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError: (error) =>
      toast.error(
        isAxiosError(error) && error.response?.status === 409
          ? "This project has wells, so it can't be deleted."
          : "Could not delete the project. Please try again.",
      ),
  });
}
