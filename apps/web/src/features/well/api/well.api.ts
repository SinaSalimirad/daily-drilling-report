import api from "@/lib/axios";
import type { CreateWellInput, UpdateWellInput, Well, WellListItem } from "../type";

// Each function returns the response body, so callers never deal with AxiosResponse.
export const wellApi = {
  list: async () => (await api.get<WellListItem[]>("/v1/wells")).data,
  create: async (input: CreateWellInput) => (await api.post<Well>("/v1/wells", input)).data,
  edit: async (id: string, input: UpdateWellInput) =>
    (await api.patch<Well>(`/v1/wells/${id}`, input)).data,
  remove: async (id: string) => {
    await api.delete(`/v1/wells/${id}`);
  },
};
