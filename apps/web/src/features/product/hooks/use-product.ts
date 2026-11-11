import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../api/product.api";

const key = ["reports"] as const;

export const useProduct = () => useQuery({ queryKey: key, queryFn: productApi.list });

export function useCreateProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: productApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: productApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
