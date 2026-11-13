import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { inventoryApi } from "../api/inventory.api";
import type { UpdateInventoryInput } from "../type";

export const inventoryKeys = {
  all: ["inventories"] as const,
  list: () => [...inventoryKeys.all, "list"] as const,
};

export const useInventories = () =>
  useQuery({ queryKey: inventoryKeys.list(), queryFn: inventoryApi.list });

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      toast.success("Inventory added");
      return queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInventoryInput }) =>
      inventoryApi.edit(id, input),
    onSuccess: () => {
      toast.success("Inventory updated");
      return queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useDeleteInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inventoryApi.remove,
    onSuccess: () => {
      toast.success("Inventory deleted");
      return queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
    onError: () => toast.error("Could not delete the inventory. Please try again."),
  });
}
