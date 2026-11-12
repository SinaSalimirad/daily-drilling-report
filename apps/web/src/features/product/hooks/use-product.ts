import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../api/product.api";

export const productKeys = {
  all: ["products"] as const,
  list: () => [...productKeys.all, "list"] as const,
};

export const useProducts = () =>
  useQuery({ queryKey: productKeys.list(), queryFn: productApi.list });

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}
