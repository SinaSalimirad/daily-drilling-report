import api from "@/lib/axios";
import type {
  CreateInventoryInput,
  Inventory,
  InventoryListItem,
  UpdateInventoryInput,
} from "../type";

// Each function returns the response body, so callers never deal with AxiosResponse.
export const inventoryApi = {
  list: async () => (await api.get<InventoryListItem[]>("/v1/inventories")).data,
  create: async (input: CreateInventoryInput) =>
    (await api.post<Inventory>("/v1/inventories", input)).data,
  edit: async (id: string, input: UpdateInventoryInput) =>
    (await api.patch<Inventory>(`/v1/inventories/${id}`, input)).data,
  remove: async (id: string) => {
    await api.delete(`/v1/inventories/${id}`);
  },
};
