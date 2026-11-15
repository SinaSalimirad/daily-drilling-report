import {
  productCreateSchema,
  productListQuerySchema,
  productParamsSchema,
  productSchema,
  productUpdateSchema,
  projectParamsSchema,
  projectProductCreateSchema,
  projectProductParamsSchema,
  projectProductSchema,
  projectProductUpdateSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { list, ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { productsRepository } from './repository';
import { productsService } from './service';

// Product catalogue (/products) and project price list (/projects/:projectId/products,
// /project-products/:projectProductId).

const product = z.object({ data: productSchema });
const products = z.object({
  data: z.array(productSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});
const entry = z.object({ data: projectProductSchema });
const priceList = z.object({ data: z.array(projectProductSchema) });

export const productsRoutes = (db: Db) => {
  const service = productsService(productsRepository(db), projectsService(projectsRepository(db)));
  return (
    new Elysia({ name: 'products' })
      .use(guard)
      // --- catalogue ---
      .get(
        '/products',
        async ({ query }) => {
          const { data, meta } = await service.list(query);
          return list(data, meta);
        },
        { permission: 'report:read', query: productListQuerySchema, response: { 200: products } },
      )
      .post(
        '/products',
        async ({ body, set }) => {
          set.status = 201;
          return ok(await service.create(body));
        },
        { permission: 'master:manage', body: productCreateSchema, response: { 201: product } },
      )
      .get(
        '/products/:productId',
        async ({ params }) => ok(await service.getProduct(params.productId)),
        {
          permission: 'report:read',
          params: productParamsSchema,
          response: { 200: product },
        },
      )
      .patch(
        '/products/:productId',
        async ({ params, body }) => ok(await service.update(params.productId, body)),
        {
          permission: 'master:manage',
          params: productParamsSchema,
          body: productUpdateSchema,
          response: { 200: product },
        },
      )
      .delete(
        '/products/:productId',
        async ({ params, set }) => {
          await service.remove(params.productId);
          set.status = 204;
        },
        {
          permission: 'master:manage',
          params: productParamsSchema,
          response: { 204: z.undefined() },
        },
      )
      // --- price list ---
      .get(
        '/projects/:projectId/products',
        async ({ params }) => ok(await service.listForProject(params.projectId)),
        { permission: 'report:read', params: projectParamsSchema, response: { 200: priceList } },
      )
      .post(
        '/projects/:projectId/products',
        async ({ params, body, set }) => {
          set.status = 201;
          return ok(await service.addToProject(params.projectId, body));
        },
        {
          permission: 'price:manage',
          params: projectParamsSchema,
          body: projectProductCreateSchema,
          response: { 201: entry },
        },
      )
      .get(
        '/project-products/:projectProductId',
        async ({ params }) => ok(await service.getProjectProduct(params.projectProductId)),
        { permission: 'report:read', params: projectProductParamsSchema, response: { 200: entry } },
      )
      .patch(
        '/project-products/:projectProductId',
        async ({ params, body }) =>
          ok(await service.updateProjectProduct(params.projectProductId, body)),
        {
          permission: 'price:manage',
          params: projectProductParamsSchema,
          body: projectProductUpdateSchema,
          response: { 200: entry },
        },
      )
      .delete(
        '/project-products/:projectProductId',
        async ({ params, set }) => {
          await service.removeFromProject(params.projectProductId);
          set.status = 204;
        },
        {
          permission: 'price:manage',
          params: projectProductParamsSchema,
          response: { 204: z.undefined() },
        },
      )
  );
};
