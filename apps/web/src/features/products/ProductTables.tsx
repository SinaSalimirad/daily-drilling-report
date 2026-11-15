'use client';

import {
  PRODUCT_ORIGINS,
  PRODUCT_UNITS,
  type Product,
  type ProjectProduct,
  productCreateSchema,
  projectProductCreateSchema,
  projectProductUpdateSchema,
} from '@ddr/schemas';
import { toast } from 'sonner';
import { type Draft, EditableTable } from '@/components/EditableTable';
import { Loading, QueryError } from '@/components/QueryState';
import { enumLabel } from '@/lib/labels';
import {
  usePriceList,
  usePriceListMutations,
  useProductMutations,
  useProducts,
} from './use-products';

const text = (v: Draft[string] | undefined) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
const num = (v: Draft[string] | undefined) =>
  v === null || v === undefined || v === ''
    ? undefined
    : typeof v === 'number'
      ? v
      : Number(String(v).replace(',', '.'));

const UNIT_LABELS: Record<(typeof PRODUCT_UNITS)[number], string> = {
  kg: 'kg',
  lb: 'lb',
  t: 'MT',
  gal: 'gal',
  l: 'L',
  m3: 'm³',
  bbl: 'bbl',
};

// --- catalogue ---
export function CatalogueTable() {
  const products = useProducts();
  const m = useProductMutations();
  if (products.isPending) return <Loading what="Loading products" />;
  if (products.isError) return <QueryError error={products.error} />;
  return (
    <EditableTable<Product>
      idPrefix="product"
      rows={products.data}
      rowLabel={(p) => p.name}
      fields={[
        { key: 'name', label: 'Product', kind: 'text', required: true },
        { key: 'packageSize', label: 'Package', kind: 'number', width: 'w-32' },
        {
          key: 'packageUnit',
          label: 'Unit',
          kind: 'select',
          options: PRODUCT_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] })),
          width: 'w-28',
        },
        { key: 'specificGravity', label: 'SG', kind: 'number', width: 'w-28' },
      ]}
      blank={{ name: '', packageSize: '', packageUnit: 'kg', specificGravity: '' }}
      toDraft={(p) => ({
        name: p.name,
        packageSize: String(p.packageSize),
        packageUnit: p.packageUnit,
        specificGravity: p.specificGravity === null ? '' : String(p.specificGravity),
      })}
      toPayload={(d) => ({
        name: text(d.name) ?? '',
        packageSize: num(d.packageSize),
        packageUnit: d.packageUnit,
        specificGravity: num(d.specificGravity) ?? null,
      })}
      schema={productCreateSchema}
      conflicts={{
        products_name_unique: {
          field: 'name',
          message: 'This product is already in the catalogue',
        },
      }}
      onCreate={(payload) => m.create.mutateAsync(payload)}
      onUpdate={(id, payload) => m.update.mutateAsync({ id, input: payload })}
      onDelete={async (p) => {
        await m.remove.mutateAsync(p.id);
        toast.success(`${p.name} deleted`);
      }}
    />
  );
}

// --- price list of a project ---
export function PriceListTable({ projectId, currency }: { projectId: string; currency: string }) {
  const prices = usePriceList(projectId);
  const products = useProducts();
  const m = usePriceListMutations(projectId);
  if (prices.isPending || products.isPending) return <Loading what="Loading the price list" />;
  if (prices.isError) return <QueryError error={prices.error} />;
  if (products.isError) return <QueryError error={products.error} />;

  const listed = new Set(prices.data.map((p) => p.product.id));
  const unlisted = products.data.filter((p) => !listed.has(p.id));
  const productOptions = [
    { value: '', label: unlisted.length ? 'Choose a product…' : 'All products are listed' },
    ...products.data.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <EditableTable<ProjectProduct>
      idPrefix="price"
      rows={prices.data}
      rowLabel={(p) => p.product.name}
      fields={[
        {
          key: 'productId',
          label: 'Product',
          kind: 'select',
          options: productOptions,
          lockedOnEdit: true,
        },
        {
          key: 'origin',
          label: 'Origin',
          kind: 'select',
          options: PRODUCT_ORIGINS.map((o) => ({ value: o, label: enumLabel(o) })),
          width: 'w-32',
        },
        { key: 'unitPrice', label: 'Unit price', kind: 'number', suffix: currency, width: 'w-40' },
        {
          key: 'active',
          label: 'Status',
          kind: 'select',
          options: [
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ],
          width: 'w-32',
        },
        {
          key: 'keyStock',
          label: 'Key stock',
          kind: 'select',
          options: [
            { value: 'false', label: 'No' },
            { value: 'true', label: 'Yes' },
          ],
          width: 'w-28',
        },
      ]}
      blank={{ productId: '', origin: 'local', unitPrice: '', active: 'true', keyStock: 'false' }}
      toDraft={(p) => ({
        productId: p.product.id,
        origin: p.origin,
        unitPrice: String(p.unitPrice),
        active: String(p.active),
        keyStock: String(p.keyStock),
      })}
      toPayload={(d) => ({
        productId: d.productId === '' ? undefined : d.productId,
        origin: d.origin,
        unitPrice: num(d.unitPrice),
        active: d.active === 'true',
      })}
      schema={projectProductCreateSchema}
      toUpdatePayload={(d) => ({
        origin: d.origin,
        unitPrice: num(d.unitPrice),
        active: d.active === 'true',
        keyStock: d.keyStock === 'true',
      })}
      updateSchema={projectProductUpdateSchema}
      conflicts={{
        project_products_project_id_product_id_unique: {
          field: 'productId',
          message: 'This product already has a price in this project',
        },
      }}
      onCreate={(payload) => m.create.mutateAsync(payload)}
      onUpdate={(id, payload) => m.update.mutateAsync({ id, input: payload })}
      onDelete={async (p) => {
        await m.remove.mutateAsync(p.id);
        toast.success(`${p.product.name} removed from the price list`);
      }}
    />
  );
}
