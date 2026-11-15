'use client';

import { PageHeader } from '@/components/PageHeader';
import { CatalogueTable } from '@/features/products/ProductTables';

/** Product catalogue shared by all projects; prices are set per project. */
export default function ProductsPage() {
  return (
    <>
      <PageHeader title="Product catalogue" />
      <main className="flex flex-col gap-2 p-4">
        <p className="text-muted-foreground text-sm">
          Package size is in the package's own unit (e.g. 25 kg, 55 gal). Prices are set on each
          project's price list.
        </p>
        <CatalogueTable />
      </main>
    </>
  );
}
