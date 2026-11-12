"use client";

import { ArrowRightFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductSheet } from "@/features/product/components/product-sheet";
import { ProductTable } from "@/features/product/components/product-table";
import { ProductsSkeleton } from "@/features/product/components/products-skeleton";
import { useProducts } from "@/features/product/hooks/use-product";

export function ProductsPage() {
  const { data: products = [], isPending, isError, isRefetching, refetch } = useProducts();

  if (isPending) return <ProductsSkeleton />;

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md border p-4">
        <p className="text-sm">Could not load products. Check your connection and try again.</p>
        <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Products</h2>

          <p className="text-xs text-muted-foreground">
            Manage and track drilling fluid products, their specifications and pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ProductSheet />

          <Button size="lg" className="h-10 p-4" variant="outline">
            <ArrowRightFromLine className="size-4 -rotate-90" />
            Export
          </Button>
        </div>
      </header>

      <ProductTable data={products} />
    </section>
  );
}
