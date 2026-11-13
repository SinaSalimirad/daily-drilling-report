import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { productApi } from "../api/product.api";
import type { UpdateProductInput } from "../type";

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
    onSuccess: () => {
      toast.success("Product added");
      return queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      productApi.edit(id, input),
    onSuccess: () => {
      toast.success("Product updated");
      return queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.remove,
    onSuccess: () => {
      toast.success("Product deleted");
      return queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) =>
      toast.error(
        isAxiosError(error) && error.response?.status === 409
          ? "This product is used in report inventories, so it can't be deleted."
          : "Could not delete the product. Please try again.",
      ),
  });
}
