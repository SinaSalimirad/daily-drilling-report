import type { ProductListQuery } from '@ddr/schemas';
import { and, asc, count, desc, eq, ne } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { products, projectProducts } from '../../db/schema';

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;

/** A price-list row with its product; `unitPrice` already converted from numeric. */
export type ProjectProductRow = Omit<typeof projectProducts.$inferSelect, 'unitPrice'> & {
  unitPrice: number;
  product: ProductRow;
};

type PriceValues = {
  origin?: 'foreign' | 'local';
  unitPrice?: number;
  active?: boolean;
  keyStock?: boolean;
};

/** numeric(14,2) comes back as a string; convert at the repository boundary (stack-decisions). */
const priceToDb = ({ unitPrice, ...rest }: PriceValues) =>
  unitPrice === undefined ? rest : { ...rest, unitPrice: unitPrice.toFixed(2) };

export const productsRepository = (db: Db) => {
  const findProjectProduct = async (id: string): Promise<ProjectProductRow | undefined> => {
    const [row] = await db
      .select({ pp: projectProducts, product: products })
      .from(projectProducts)
      .innerJoin(products, eq(products.id, projectProducts.productId))
      .where(eq(projectProducts.id, id));
    return row && { ...row.pp, unitPrice: Number(row.pp.unitPrice), product: row.product };
  };

  return {
    // --- catalogue ---
    async list({ page, pageSize, sort }: ProductListQuery) {
      const column = sort?.field === 'createdAt' ? products.createdAt : products.name;
      const order = sort?.direction === 'desc' ? desc(column) : asc(column);
      const [rows, totals] = await Promise.all([
        db
          .select()
          .from(products)
          .orderBy(order, asc(products.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ total: count() }).from(products),
      ]);
      return { rows, total: totals[0]?.total ?? 0 };
    },

    async findById(productId: string): Promise<ProductRow | undefined> {
      const [row] = await db.select().from(products).where(eq(products.id, productId));
      return row;
    },

    async insert(values: NewProductRow): Promise<ProductRow> {
      const [row] = await db.insert(products).values(values).returning();
      if (!row) throw new Error('insert into products returned no row');
      return row;
    },

    async update(productId: string, values: Partial<NewProductRow>) {
      const [row] = await db
        .update(products)
        .set(values)
        .where(eq(products.id, productId))
        .returning();
      return row;
    },

    /** Throws a foreign-key violation (→ 409 IN_USE) while a price list holds the product. */
    async delete(productId: string): Promise<boolean> {
      const rows = await db
        .delete(products)
        .where(eq(products.id, productId))
        .returning({ id: products.id });
      return rows.length > 0;
    },

    // --- price list ---
    async listForProject(projectId: string): Promise<ProjectProductRow[]> {
      const rows = await db
        .select({ pp: projectProducts, product: products })
        .from(projectProducts)
        .innerJoin(products, eq(products.id, projectProducts.productId))
        .where(eq(projectProducts.projectId, projectId))
        .orderBy(asc(products.name), asc(projectProducts.id));
      return rows.map((r) => ({ ...r.pp, unitPrice: Number(r.pp.unitPrice), product: r.product }));
    },

    findProjectProduct,

    async countKeyStock(projectId: string, exceptId: string): Promise<number> {
      const [row] = await db
        .select({ total: count() })
        .from(projectProducts)
        .where(
          and(
            eq(projectProducts.projectId, projectId),
            eq(projectProducts.keyStock, true),
            ne(projectProducts.id, exceptId),
          ),
        );
      return row?.total ?? 0;
    },

    async insertProjectProduct(
      values: { projectId: string; productId: string } & Required<
        Pick<PriceValues, 'origin' | 'unitPrice'>
      > &
        Pick<PriceValues, 'active'>,
    ): Promise<ProjectProductRow> {
      const [row] = await db
        .insert(projectProducts)
        .values({ ...values, unitPrice: values.unitPrice.toFixed(2) })
        .returning({ id: projectProducts.id });
      const inserted = row && (await findProjectProduct(row.id));
      if (!inserted) throw new Error('insert into project_products returned no row');
      return inserted;
    },

    async updateProjectProduct(id: string, values: PriceValues) {
      const [row] = await db
        .update(projectProducts)
        .set(priceToDb(values))
        .where(eq(projectProducts.id, id))
        .returning({ id: projectProducts.id });
      return row ? findProjectProduct(row.id) : undefined;
    },

    /** Throws a foreign-key violation (→ 409 IN_USE) once inventory moves refer to it (v0.4.0). */
    async deleteProjectProduct(id: string): Promise<boolean> {
      const rows = await db
        .delete(projectProducts)
        .where(eq(projectProducts.id, id))
        .returning({ id: projectProducts.id });
      return rows.length > 0;
    },
  };
};
