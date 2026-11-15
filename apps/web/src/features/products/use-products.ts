import type {
  ProductCreate,
  ProductUpdate,
  ProjectProductCreate,
  ProjectProductUpdate,
} from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export const productKeys = {
  catalogue: ['products', 'list', {}] as const,
  priceList: (projectId: string) => ['project-products', 'list', { projectId }] as const,
};

/** The whole catalogue, by name (the workbook has 65 rows; the API allows 100 per page). */
export function useProducts() {
  return useQuery({
    queryKey: productKeys.catalogue,
    queryFn: async () =>
      (
        await unwrap(
          // Eden types a query by the schema's parsed output; the wire takes strings.
          api.v1.products.get({ query: { pageSize: 100, sort: 'name:asc' } as never }),
        )
      ).data,
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['project-products'] }),
    ]);
  return {
    create: useMutation({
      mutationFn: (input: ProductCreate) => unwrap(api.v1.products.post(input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ProductUpdate }) =>
        unwrap(api.v1.products({ productId: id }).patch(input)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => unwrap(api.v1.products({ productId: id }).delete()),
      onSuccess,
    }),
  };
}

export function usePriceList(projectId: string) {
  return useQuery({
    queryKey: productKeys.priceList(projectId),
    queryFn: async () => (await unwrap(api.v1.projects({ projectId }).products.get())).data,
  });
}

export function usePriceListMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['project-products'] });
  return {
    create: useMutation({
      mutationFn: (input: ProjectProductCreate) =>
        unwrap(api.v1.projects({ projectId }).products.post(input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ProjectProductUpdate }) =>
        unwrap(api.v1['project-products']({ projectProductId: id }).patch(input)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        unwrap(api.v1['project-products']({ projectProductId: id }).delete()),
      onSuccess,
    }),
  };
}
