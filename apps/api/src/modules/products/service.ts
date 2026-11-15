import type {
  Product,
  ProductCreate,
  ProductListQuery,
  ProductUpdate,
  ProjectProduct,
  ProjectProductCreate,
  ProjectProductUpdate,
} from '@ddr/schemas';
import { NotFoundError, ValidationError } from '../../lib/errors';
import type { projectsService } from '../projects/service';
import type { ProductRow, ProjectProductRow, productsRepository } from './repository';

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  packageSize: row.packageSize,
  packageUnit: row.packageUnit,
  specificGravity: row.specificGravity,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** Key-stock box of the DMR: five product numbers (workbook `A77:A81`). */
const MAX_KEY_STOCK = 5;

const toProjectProduct = (row: ProjectProductRow): ProjectProduct => ({
  id: row.id,
  projectId: row.projectId,
  product: toProduct(row.product),
  origin: row.origin,
  unitPrice: row.unitPrice,
  active: row.active,
  keyStock: row.keyStock,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const productsService = (
  repository: ReturnType<typeof productsRepository>,
  projects: ReturnType<typeof projectsService>,
) => {
  const getProduct = async (productId: string): Promise<Product> => {
    const row = await repository.findById(productId);
    if (!row) throw new NotFoundError('Product not found');
    return toProduct(row);
  };

  const getProjectProduct = async (id: string): Promise<ProjectProduct> => {
    const row = await repository.findProjectProduct(id);
    if (!row) throw new NotFoundError('Price list entry not found');
    return toProjectProduct(row);
  };

  return {
    // --- catalogue ---
    getProduct,

    async list(query: ProductListQuery) {
      const { rows, total } = await repository.list(query);
      return {
        data: rows.map(toProduct),
        meta: { page: query.page, pageSize: query.pageSize, total },
      };
    },

    /** A duplicate name is rejected by the unique constraint (409 CONFLICT). */
    async create(input: ProductCreate): Promise<Product> {
      return toProduct(await repository.insert(input));
    },

    async update(productId: string, input: ProductUpdate): Promise<Product> {
      const row = await repository.update(productId, input);
      if (!row) throw new NotFoundError('Product not found');
      return toProduct(row);
    },

    /** A product on any price list cannot be deleted: 409 IN_USE from the foreign key. */
    async remove(productId: string): Promise<void> {
      await getProduct(productId);
      await repository.delete(productId);
    },

    // --- price list ---
    getProjectProduct,

    async listForProject(projectId: string): Promise<ProjectProduct[]> {
      await projects.get(projectId);
      return (await repository.listForProject(projectId)).map(toProjectProduct);
    },

    /** One price per product and project (409 CONFLICT on a second one). */
    async addToProject(projectId: string, input: ProjectProductCreate): Promise<ProjectProduct> {
      await projects.get(projectId);
      await getProduct(input.productId);
      return toProjectProduct(await repository.insertProjectProduct({ ...input, projectId }));
    },

    async updateProjectProduct(id: string, input: ProjectProductUpdate): Promise<ProjectProduct> {
      if (input.keyStock) {
        const current = await getProjectProduct(id);
        if ((await repository.countKeyStock(current.projectId, id)) >= MAX_KEY_STOCK) {
          throw new ValidationError([
            {
              path: 'body.keyStock',
              message: `At most ${MAX_KEY_STOCK} key-stock products per project`,
            },
          ]);
        }
      }
      const row = await repository.updateProjectProduct(id, input);
      if (!row) throw new NotFoundError('Price list entry not found');
      return toProjectProduct(row);
    },

    async removeFromProject(id: string): Promise<void> {
      await getProjectProduct(id);
      await repository.deleteProjectProduct(id);
    },
  };
};
