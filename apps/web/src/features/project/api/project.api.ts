import api from "@/lib/axios";
import type { CreateProjectInput, Project, UpdateProjectInput } from "../type";

// Each function returns the response body, so callers never deal with AxiosResponse.
export const projectApi = {
  list: async () => (await api.get<Project[]>("/v1/projects")).data,
  create: async (input: CreateProjectInput) =>
    (await api.post<Project>("/v1/projects", input)).data,
  edit: async (id: string, input: UpdateProjectInput) =>
    (await api.patch<Project>(`/v1/projects/${id}`, input)).data,
  remove: async (id: string) => {
    await api.delete(`/v1/projects/${id}`);
  },
};
